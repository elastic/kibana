/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AttachmentTimelineEvent, DynamicToolDefinition } from '@kbn/agent-builder-common';
import { TimelineEventType, ToolOrigin } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getVersion, toAttachment } from '@kbn/agent-builder-common/attachments';
import { renderDynamicToolDefinition } from '@kbn/agent-builder-genai-utils/langchain';
import type { ExecutableTool } from '@kbn/agent-builder-server';
import type {
  AttachmentFormatContext,
  AttachmentStateManager,
} from '@kbn/agent-builder-server/attachments';
import type { AttachmentsService, ToolManager } from '@kbn/agent-builder-server/runner';
import { ToolManagerToolType } from '@kbn/agent-builder-server/runner';

/**
 * The tools an attachment binds to itself at one of its versions (`getBoundedTools`), ready to run.
 * Bound tools are optional, so a missing version, an unknown type or a failing `format` yields none.
 */
export const resolveAttachmentBoundTools = async ({
  attachment,
  version,
  attachmentsService,
  formatContext,
}: {
  attachment: VersionedAttachment;
  version: number;
  attachmentsService: AttachmentsService;
  formatContext: AttachmentFormatContext;
}): Promise<ExecutableTool[]> => {
  const attachmentVersion = getVersion(attachment, version);
  if (!attachmentVersion) {
    return [];
  }

  const definition = attachmentsService.getTypeDefinition(attachment.type);
  if (!definition) {
    return [];
  }

  try {
    const formatted = await definition.format(
      toAttachment(attachment, attachmentVersion),
      formatContext
    );
    const boundedTools = formatted.getBoundedTools ? await formatted.getBoundedTools() : [];
    return boundedTools.map((tool) => attachmentsService.convertAttachmentTool(tool));
  } catch {
    // Ignore formatting errors; bounded tools are optional.
    return [];
  }
};

/**
 * The attachment version an event announces tools for. A deleted attachment announces none.
 */
const announcedVersion = (event: AttachmentTimelineEvent): number | undefined => {
  switch (event.type) {
    case TimelineEventType.attachmentAdded:
    case TimelineEventType.attachmentRestored:
    case TimelineEventType.attachmentUpdated:
      return event.data.current_version;
    case TimelineEventType.attachmentDeleted:
      return undefined;
  }
};

const versionKey = (attachmentId: string, version: number): string => `${attachmentId}@${version}`;

export interface AttachmentBoundToolsOptions {
  attachmentStateManager: AttachmentStateManager;
  attachmentsService: AttachmentsService;
  formatContext: AttachmentFormatContext;
  logger?: Logger;
}

/**
 * The tools bound to a run's attachments, resolved once per attachment version and used two ways:
 *
 * - `prepare` and `get` give the definitions an attachment event renders. Rendering is synchronous
 *   but resolving needs the async `format()`, so `prepare` resolves beforehand and `get` reads what
 *   was resolved. An event's definitions come from the version it announces, not the latest one,
 *   so the event renders the same on every prompt build.
 * - `sync` keeps the tools of the active attachments registered as dynamic tools: it registers the
 *   tools bound to the attachments active now and removes the ones registered before that are no
 *   longer bound (a deleted attachment, a version replaced by one binding fewer tools).
 */
export class AttachmentBoundTools {
  /** The tools of each attachment version, resolved once. */
  private readonly tools = new Map<string, Promise<ExecutableTool[]>>();
  /**
   * Rendered definitions by attachment version; undefined for a version that binds no tool whose
   * definition renders.
   */
  private readonly definitions = new Map<string, DynamicToolDefinition[] | undefined>();
  /** The ids of the tools `sync` registered last. */
  private registeredIds = new Set<string>();

  constructor(private readonly options: AttachmentBoundToolsOptions) {}

  /** Resolves the definitions of the events that carry them; call before rendering the events. */
  async prepare(events: readonly AttachmentTimelineEvent[]): Promise<void> {
    const pending = new Map<string, { attachmentId: string; version: number }>();
    for (const event of events) {
      const version = announcedVersion(event);
      if (version === undefined) {
        continue;
      }
      const key = versionKey(event.data.attachment_id, version);
      if (!this.definitions.has(key)) {
        pending.set(key, { attachmentId: event.data.attachment_id, version });
      }
    }
    await Promise.all(
      [...pending].map(async ([key, { attachmentId, version }]) => {
        this.definitions.set(key, await this.render(attachmentId, version));
      })
    );
  }

  /** The definitions the event carries; undefined when it carries none or was not prepared. */
  get(event: AttachmentTimelineEvent): DynamicToolDefinition[] | undefined {
    const version = announcedVersion(event);
    return version === undefined
      ? undefined
      : this.definitions.get(versionKey(event.data.attachment_id, version));
  }

  /** Registers the tools bound to the active attachments and removes the ones no longer bound. */
  async sync(toolManager: ToolManager): Promise<void> {
    const active = this.options.attachmentStateManager.getActive();
    const tools = (
      await Promise.all(
        active.map((attachment) => this.resolve(attachment.id, attachment.current_version))
      )
    ).flat();
    // `Promise.all` keeps the attachment order, so on an id clash the last attachment's tool wins
    const ids = new Set(tools.map((tool) => tool.id));
    toolManager.removeDynamicTools([...this.registeredIds].filter((id) => !ids.has(id)));
    // Bound tools are not registry entries, so they are inline tools
    await toolManager.addTools({
      type: ToolManagerToolType.dynamic,
      tools: tools.map((tool) => ({ ...tool, origin: ToolOrigin.inline })),
    });
    this.registeredIds = ids;
  }

  private resolve(attachmentId: string, version: number): Promise<ExecutableTool[]> {
    const key = versionKey(attachmentId, version);
    let tools = this.tools.get(key);
    if (!tools) {
      tools = this.resolveVersion(attachmentId, version);
      this.tools.set(key, tools);
    }
    return tools;
  }

  private async resolveVersion(attachmentId: string, version: number): Promise<ExecutableTool[]> {
    const { attachmentStateManager, attachmentsService, formatContext } = this.options;
    // The record keeps every version, also of a soft-deleted attachment.
    const attachment = attachmentStateManager.getAttachmentRecord(attachmentId);
    if (!attachment) {
      return [];
    }
    return resolveAttachmentBoundTools({ attachment, version, attachmentsService, formatContext });
  }

  private async render(
    attachmentId: string,
    version: number
  ): Promise<DynamicToolDefinition[] | undefined> {
    const tools = await this.resolve(attachmentId, version);
    const definitions = await Promise.all(tools.map((tool) => this.renderDefinition(tool)));
    const rendered = definitions.filter((def): def is DynamicToolDefinition => def !== undefined);
    return rendered.length > 0 ? rendered : undefined;
  }

  /**
   * A tool whose description or schema cannot be rendered is left undescribed rather than failing
   * the run, as a failing `format()` leaves the attachment without tools.
   */
  private async renderDefinition(tool: ExecutableTool): Promise<DynamicToolDefinition | undefined> {
    try {
      return await renderDynamicToolDefinition(tool);
    } catch (error) {
      this.options.logger?.warn(
        `Failed to render the definition of bound tool ${tool.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return undefined;
    }
  }
}

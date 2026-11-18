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
import type { ExecutableTool, ToolProvider } from '@kbn/agent-builder-server';
import type {
  AttachmentFormatContext,
  AttachmentStateManager,
} from '@kbn/agent-builder-server/attachments';
import type { AttachmentsService, ToolManager } from '@kbn/agent-builder-server/runner';
import { ToolManagerToolType } from '@kbn/agent-builder-server/runner';
import { pickTools } from './select_tools';

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

interface AnnouncedVersion {
  attachmentId: string;
  version: number;
  type: string;
}

/** The attachment versions the events announce, by key, in event order. */
const announcedVersions = (
  events: readonly AttachmentTimelineEvent[]
): Map<string, AnnouncedVersion> => {
  const announced = new Map<string, AnnouncedVersion>();
  for (const event of events) {
    const version = announcedVersion(event);
    if (version !== undefined) {
      announced.set(versionKey(event.data.attachment_id, version), {
        attachmentId: event.data.attachment_id,
        version,
        type: event.data.attachment_type,
      });
    }
  }
  return announced;
};

export interface AttachmentBoundToolsOptions {
  attachmentStateManager: AttachmentStateManager;
  attachmentsService: AttachmentsService;
  formatContext: AttachmentFormatContext;
  toolProvider: ToolProvider;
  /**
   * Whether the agent has the tool in its native tool list. It calls such a tool directly, so a
   * type tool it has natively is neither described nor registered as a dynamic tool. Asked when
   * the definitions are read, not in `prepare`, which runs before the run adds its native tools.
   */
  isNativeTool: (toolId: string) => boolean;
  logger?: Logger;
}

/**
 * The tools a run's attachments make available, as dynamic tools: the ones bound to one attachment
 * version (`getBoundedTools`) and the registry tools its type declares (`getTools`). Used two ways:
 *
 * - `prepare` and `get` give the definitions an attachment event renders. Rendering is synchronous
 *   but resolving needs the async `format()`, so `prepare` resolves beforehand and `get` reads what
 *   was resolved. An event's bound definitions come from the version it announces, not the latest
 *   one, and a type tool is described once, by the first prepared event of a type declaring it, so
 *   the event renders the same on every prompt build.
 * - `sync` keeps the tools of the active attachments registered as dynamic tools: it registers the
 *   tools bound to the attachments active now and the tools of their types, and removes the ones
 *   registered before that are no longer available (a deleted attachment, a version replaced by one
 *   binding fewer tools, the last attachment of a type gone).
 *
 * A type tool the agent already has in its native tool list stays native: it is left out of both.
 */
export class AttachmentBoundTools {
  /** The bound tools of each attachment version, resolved once. */
  private readonly tools = new Map<string, Promise<ExecutableTool[]>>();
  /**
   * Rendered bound definitions by attachment version; undefined for a version that binds no tool
   * whose definition renders.
   */
  private readonly definitions = new Map<string, DynamicToolDefinition[] | undefined>();
  /** The registry tools each attachment type declares, resolved once. */
  private readonly typeTools = new Map<string, Promise<ExecutableTool[]>>();
  /** The rendered definitions of each type's tools, resolved once. */
  private readonly typeDefinitions = new Map<string, Promise<DynamicToolDefinition[]>>();
  /** The rendered definitions of each type's tools, once resolved, for the synchronous `get`. */
  private readonly renderedTypeDefinitions = new Map<string, DynamicToolDefinition[]>();
  /** The attachment version (by key) whose event describes each type tool, by tool id. */
  private readonly typeToolOwners = new Map<string, string>();
  /** The ids of the tools `sync` registered last. */
  private registeredIds = new Set<string>();
  /** The attachment versions the events given to `prepare` announced, by key. */
  private readonly announced = new Set<string>();

  constructor(private readonly options: AttachmentBoundToolsOptions) {}

  /** Resolves the definitions of the events that carry them; call before rendering the events. */
  async prepare(events: readonly AttachmentTimelineEvent[]): Promise<void> {
    const announcedAttachmentVersions = announcedVersions(events);
    announcedAttachmentVersions.keys().forEach((key) => this.announced.add(key));
    const types = new Set(announcedAttachmentVersions.values().map(({ type }) => type));
    await Promise.all([
      Promise.all(
        announcedAttachmentVersions
          .values()
          .map(({ attachmentId, version }) => this.resolveVersionDefinitions(attachmentId, version))
      ),
      Promise.all(types.values().map((type) => this.resolveTypeDefinitions(type))),
    ]);
    // A type tool not described yet is described by the first of these events whose type declares
    // it: events are prepared in timeline order, so the owner is the same on every prompt build.
    announcedAttachmentVersions.forEach(({ type }, key) => {
      this.renderedTypeDefinitions.get(type)?.forEach((definition) => {
        if (!this.typeToolOwners.has(definition.tool_id)) {
          this.typeToolOwners.set(definition.tool_id, key);
        }
      });
    });
  }

  /** The definitions the event carries; undefined when it carries none or was not prepared. */
  get(event: AttachmentTimelineEvent): DynamicToolDefinition[] | undefined {
    const version = announcedVersion(event);
    if (version === undefined) {
      return undefined;
    }
    const key = versionKey(event.data.attachment_id, version);
    const bound = this.definitions.get(key) ?? [];
    const owned = (this.renderedTypeDefinitions.get(event.data.attachment_type) ?? []).filter(
      (definition) =>
        this.typeToolOwners.get(definition.tool_id) === key &&
        !this.options.isNativeTool(definition.tool_id)
    );
    const carried = [...bound, ...owned];
    return carried.length > 0 ? carried : undefined;
  }

  /**
   * The definitions of the tools the attachments active now make available that no event
   * describes: the tools bound to an attachment at its current version that neither an event in
   * `events` nor one `prepare` saw announces, and the tools of the active types no prepared event
   * owns. A conversation stored before attachment events existed carries its attachments on its
   * messages, with no event to render their definitions after. Resolve this when the prompt is
   * built: a tool that updates or deletes such an attachment during the run changes the answer.
   */
  async unannouncedDefinitions(
    events: readonly AttachmentTimelineEvent[]
  ): Promise<DynamicToolDefinition[]> {
    const announced = announcedVersions(events);
    const active = this.options.attachmentStateManager.getActive();
    const unannounced = active.filter((attachment) => {
      const key = versionKey(attachment.id, attachment.current_version);
      return !announced.has(key) && !this.announced.has(key);
    });
    const types = new Set(active.map((attachment) => attachment.type));
    const [bound, typeDefinitions] = await Promise.all([
      Promise.all(
        unannounced.map((attachment) =>
          this.resolveVersionDefinitions(attachment.id, attachment.current_version)
        )
      ),
      Promise.all(types.values().map((type) => this.resolveTypeDefinitions(type))),
    ]);
    const unowned = new Map(
      typeDefinitions
        .flat()
        .filter(
          (definition) =>
            !this.typeToolOwners.has(definition.tool_id) &&
            !this.options.isNativeTool(definition.tool_id)
        )
        .map((definition) => [definition.tool_id, definition])
    );
    return bound.flatMap((rendered) => rendered ?? []).concat(unowned.values().toArray());
  }

  private async resolveVersionDefinitions(
    attachmentId: string,
    version: number
  ): Promise<DynamicToolDefinition[] | undefined> {
    const key = versionKey(attachmentId, version);
    if (!this.definitions.has(key)) {
      const definition = await this.render(attachmentId, version);
      if (definition) {
        this.definitions.set(key, definition);
      }
    }
    return this.definitions.get(key);
  }

  /**
   * Registers the tools the active attachments make available and removes the ones no longer
   * available.
   */
  async sync(toolManager: ToolManager): Promise<void> {
    const active = this.options.attachmentStateManager.getActive();
    const types = new Set(active.map((attachment) => attachment.type));
    const [typeTools, boundTools] = await Promise.all([
      Promise.all(types.values().map((type) => this.resolveTypeTools(type))),
      Promise.all(
        active.map((attachment) => this.resolve(attachment.id, attachment.current_version))
      ),
    ]);
    // A registry tool several types declare is one tool: registered once. One the agent has
    // natively is called directly, so it is not registered.
    const registryTools = new Map(
      typeTools
        .flat()
        .filter((tool) => !this.options.isNativeTool(tool.id))
        .map((tool) => [tool.id, { ...tool, origin: ToolOrigin.registry }])
    );
    // Bound tools are not registry entries, so they are inline tools
    const inlineTools = boundTools.flat().map((tool) => ({ ...tool, origin: ToolOrigin.inline }));
    // `Promise.all` keeps the attachment order, so on an id clash the last attachment's tool wins
    const tools = registryTools.values().toArray().concat(inlineTools);
    const ids = new Set(tools.map((tool) => tool.id));
    toolManager.removeDynamicTools([...this.registeredIds].filter((id) => !ids.has(id)));
    await toolManager.addTools({ type: ToolManagerToolType.dynamic, tools });
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

  /** The registry tools the type declares (`getTools`); an unknown type or id yields none. */
  private resolveTypeTools(type: string): Promise<ExecutableTool[]> {
    let tools = this.typeTools.get(type);
    if (!tools) {
      tools = this.pickTypeTools(type);
      this.typeTools.set(type, tools);
    }
    return tools;
  }

  private async pickTypeTools(type: string): Promise<ExecutableTool[]> {
    const { attachmentsService, toolProvider, formatContext } = this.options;
    const toolIds = attachmentsService.getTypeDefinition(type)?.getTools?.() ?? [];
    if (toolIds.length === 0) {
      return [];
    }
    return pickTools({
      toolProvider,
      selection: [{ tool_ids: toolIds }],
      request: formatContext.request,
    });
  }

  private resolveTypeDefinitions(type: string): Promise<DynamicToolDefinition[]> {
    let definitions = this.typeDefinitions.get(type);
    if (!definitions) {
      definitions = this.renderTypeDefinitions(type);
      this.typeDefinitions.set(type, definitions);
    }
    return definitions;
  }

  private async renderTypeDefinitions(type: string): Promise<DynamicToolDefinition[]> {
    const tools = await this.resolveTypeTools(type);
    const definitions = await Promise.all(tools.map((tool) => this.renderDefinition(tool)));
    const rendered = definitions.filter((def): def is DynamicToolDefinition => def !== undefined);
    this.renderedTypeDefinitions.set(type, rendered);
    return rendered;
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

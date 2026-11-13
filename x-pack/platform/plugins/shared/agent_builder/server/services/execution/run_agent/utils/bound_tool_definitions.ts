/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTimelineEvent, DynamicToolDefinition } from '@kbn/agent-builder-common';
import { TimelineEventType } from '@kbn/agent-builder-common';
import { renderDynamicToolDefinition } from '@kbn/agent-builder-genai-utils/langchain';
import type {
  AttachmentFormatContext,
  AttachmentStateManager,
} from '@kbn/agent-builder-server/attachments';
import type { AttachmentsService } from '@kbn/agent-builder-server/runner';
import { resolveAttachmentBoundTools } from './attachment_bound_tools';

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

const definitionKey = (attachmentId: string, version: number): string =>
  `${attachmentId}@${version}`;

export interface BoundToolDefinitionsOptions {
  attachmentStateManager: AttachmentStateManager;
  attachmentsService: AttachmentsService;
  formatContext: AttachmentFormatContext;
}

/**
 * The definitions of the bound tools that a run's attachment events announce, looked up while the
 * prompt is rendered. Rendering is synchronous but a definition needs the async `format()`, so
 * `prepare` resolves definitions beforehand and `get` reads what was resolved.
 *
 * An event's definitions are rendered from the version it announces, not the latest one, so the
 * event renders the same on every prompt build.
 */
export class BoundToolDefinitions {
  /**
   * Resolved definitions by attachment id and version; undefined for a version that binds no
   * tools, so it is not formatted again.
   */
  private readonly definitions = new Map<string, DynamicToolDefinition[] | undefined>();

  constructor(private readonly options: BoundToolDefinitionsOptions) {}

  /** Resolves the definitions of the events that carry them; call before rendering the events. */
  async prepare(events: readonly AttachmentTimelineEvent[]): Promise<void> {
    const pending = new Map<string, { attachmentId: string; version: number }>();
    for (const event of events) {
      const version = announcedVersion(event);
      if (version === undefined) {
        continue;
      }
      const key = definitionKey(event.data.attachment_id, version);
      if (!this.definitions.has(key) && !pending.has(key)) {
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
      : this.definitions.get(definitionKey(event.data.attachment_id, version));
  }

  private async render(
    attachmentId: string,
    version: number
  ): Promise<DynamicToolDefinition[] | undefined> {
    const { attachmentStateManager, attachmentsService, formatContext } = this.options;
    // The record keeps every version, also of a soft-deleted attachment.
    const attachment = attachmentStateManager.getAttachmentRecord(attachmentId);
    if (!attachment) {
      return undefined;
    }
    const tools = await resolveAttachmentBoundTools({
      attachment,
      version,
      attachmentsService,
      formatContext,
    });
    return tools.length > 0 ? Promise.all(tools.map(renderDynamicToolDefinition)) : undefined;
  }
}

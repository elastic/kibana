/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { ConversationTemplate } from '@kbn/agent-builder-common';
import type {
  ConversationEventBus,
  ConversationUpdatedPayload,
} from '../../workflows/triggers/conversation_event_bus';
import { CONVERSATION_SUMMARY_TASK_TYPE } from './task';

const DEBOUNCE_MS = 2_000;

/**
 * One Task Manager task per conversation. Further content changes during the wait
 * reset the timer on this node. A multi-node deployment can still run two tasks;
 * the task id is stable so a second schedule on the same node does not stack.
 */
export class ConversationSummaryScheduler {
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly deps: {
      bus: ConversationEventBus;
      taskManager: TaskManagerStartContract;
      getTemplate: (templateId: string) => ConversationTemplate | undefined;
      logger: Logger;
    }
  ) {}

  start(): void {
    this.deps.bus.onConversationUpdated((request, payload) => {
      this.note(request, payload);
    });
  }

  note(request: KibanaRequest, payload: ConversationUpdatedPayload): void {
    if (!payload.contentChange || payload.summaryOnly || !payload.templateId) {
      return;
    }
    const template = this.deps.getTemplate(payload.templateId);
    const maintenance = template?.summary;
    if (!maintenance?.skillId) {
      return;
    }
    const field = maintenance.field ?? 'summary';

    const pending = this.timers.get(payload.conversationId);
    if (pending) {
      clearTimeout(pending);
    }

    const timer = setTimeout(() => {
      this.timers.delete(payload.conversationId);
      void this.schedule(request, {
        conversationId: payload.conversationId,
        templateId: payload.templateId,
        skillId: maintenance.skillId,
        field,
      });
    }, DEBOUNCE_MS);
    timer.unref?.();
    this.timers.set(payload.conversationId, timer);
  }

  private async schedule(
    request: KibanaRequest,
    params: { conversationId: string; templateId?: string; skillId: string; field: string }
  ): Promise<void> {
    try {
      await this.deps.taskManager.ensureScheduled(
        {
          id: `conversation-summary-${params.conversationId}`,
          taskType: CONVERSATION_SUMMARY_TASK_TYPE,
          params,
          state: {},
          scope: ['agent-builder'],
          enabled: true,
        },
        { request, cloneApiKey: true }
      );
    } catch (error) {
      this.deps.logger.warn(
        `Failed to schedule conversation summary for ${params.conversationId}: ${error}`
      );
    }
  }
}

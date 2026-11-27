/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { LoggerService } from '../../services/logger_service/logger_service';
import type { WorkflowService } from '../../services/workflow_service/workflow_service';
import {
  RULE_EXECUTION_SUCCEEDED_EVENT_TYPE,
  RULE_EXECUTION_FAILED_EVENT_TYPE,
  type RuleExecutionSucceededEvent,
  type RuleExecutionFailedEvent,
} from '../rule_executor_event_publisher/events';
import type { AlertingDomainEvent, AlertingPublisherContext } from '../domain_events';
import type { EventBus } from '../event_bus';
import { createWorkflowSubscriberMocks, handlerFor } from '../test_utils';
import { RuleExecutorWorkflowSubscriber } from './rule_executor_workflow_subscriber';
import { RuleEventsGeneratedTriggerId, RuleExecutionFailedTriggerId } from './triggers';

const succeededEvent: RuleExecutionSucceededEvent = {
  type: RULE_EXECUTION_SUCCEEDED_EVENT_TYPE,
  payload: {
    executionId: 'execution-uuid',
    scheduledAt: '2025-01-01T00:00:00.000Z',
    ruleEventsGenerated: 4,
    rule: {
      ruleId: 'rule-1',
      spaceId: 'my-space',
      kind: 'signal',
      tags: ['security'],
    },
  },
};

const failedEvent: RuleExecutionFailedEvent = {
  type: RULE_EXECUTION_FAILED_EVENT_TYPE,
  payload: { rule: { id: 'rule-1', spaceId: 'my-space' }, error: 'boom' },
};

describe('RuleExecutorWorkflowSubscriber', () => {
  let bus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
  let workflowService: WorkflowService;
  let workflowsExtensions: jest.Mocked<WorkflowsExtensionsServerPluginStart>;
  let mockEmitEvent: jest.Mock;
  let loggerService: LoggerService;
  let mockLogger: jest.Mocked<Logger>;
  let subscriber: RuleExecutorWorkflowSubscriber;
  let request: KibanaRequest;

  beforeEach(() => {
    ({
      bus,
      workflowService,
      workflowsExtensions,
      mockEmitEvent,
      loggerService,
      mockLogger,
      request,
    } = createWorkflowSubscriberMocks());
    subscriber = new RuleExecutorWorkflowSubscriber(bus, workflowService, loggerService);
  });

  describe('event dispatch', () => {
    it('forwards a succeeded event as the reshaped workflow payload under the acting request', async () => {
      subscriber.start();

      await handlerFor(bus, RULE_EXECUTION_SUCCEEDED_EVENT_TYPE)(succeededEvent, {
        request,
        origin: { actor: 'user', channel: 'api' },
      });

      expect(workflowsExtensions.getClient).toHaveBeenCalledWith(request);
      expect(mockEmitEvent).toHaveBeenCalledTimes(1);
      expect(mockEmitEvent).toHaveBeenCalledWith(RuleEventsGeneratedTriggerId, {
        rule: { id: 'rule-1', spaceId: 'my-space', kind: 'signal', tags: ['security'] },
        execution: { executionId: 'execution-uuid', scheduledAt: '2025-01-01T00:00:00.000Z' },
        ruleEventsGenerated: 4,
      });
    });

    it('forwards a failed event as { rule: { id, spaceId }, error }', async () => {
      subscriber.start();

      await handlerFor(bus, RULE_EXECUTION_FAILED_EVENT_TYPE)(failedEvent, {
        request,
        origin: { actor: 'user', channel: 'api' },
      });

      expect(mockEmitEvent).toHaveBeenCalledTimes(1);
      expect(mockEmitEvent).toHaveBeenCalledWith(RuleExecutionFailedTriggerId, {
        rule: { id: 'rule-1', spaceId: 'my-space' },
        error: 'boom',
      });
    });

    it('skips emission when a succeeded run produced no rule events (binding gate returns null)', async () => {
      subscriber.start();

      await handlerFor(bus, RULE_EXECUTION_SUCCEEDED_EVENT_TYPE)(
        { ...succeededEvent, payload: { ...succeededEvent.payload, ruleEventsGenerated: 0 } },
        { request, origin: { actor: 'user', channel: 'api' } }
      );

      expect(mockEmitEvent).not.toHaveBeenCalled();
    });

    it("catches WorkflowService failures, logs them with the binding's eventType, and does not let the rejection escape the handler", async () => {
      mockEmitEvent.mockRejectedValueOnce(new Error('workflows unreachable'));

      subscriber.start();

      await expect(
        handlerFor(bus, RULE_EXECUTION_SUCCEEDED_EVENT_TYPE)(succeededEvent, {
          request,
          origin: { actor: 'user', channel: 'api' },
        })
      ).resolves.toBeUndefined();

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith('workflows unreachable', {
        labels: {
          event_type: RULE_EXECUTION_SUCCEEDED_EVENT_TYPE,
          rule_id: succeededEvent.payload.rule.ruleId,
          space_id: succeededEvent.payload.rule.spaceId,
          code: ALERTING_LOG_CODES.EVENTS_RULE_EXECUTOR_WORKFLOW_SUBSCRIBER_FAILED,
        },
        error: expect.objectContaining({ message: 'workflows unreachable' }),
      });
    });
  });
});

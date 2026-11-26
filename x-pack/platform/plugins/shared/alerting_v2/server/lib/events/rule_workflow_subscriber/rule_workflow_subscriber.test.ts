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
import { RULE_CREATED_EVENT_TYPE, type RuleCreatedEvent } from '../rule_event_publisher/events';
import type { AlertingDomainEvent, AlertingPublisherContext } from '../domain_events';
import type { EventBus } from '../event_bus';
import { createWorkflowSubscriberMocks, handlerFor } from '../test_utils';
import { RuleWorkflowSubscriber } from './rule_workflow_subscriber';
import { RuleCreatedTriggerId } from './triggers';

const ruleCreatedEvent: RuleCreatedEvent = {
  type: RULE_CREATED_EVENT_TYPE,
  payload: {
    ruleId: 'rule-1',
    spaceId: 'my-space',
    correlationId: 'corr-1',
  },
};

// Workflows only ever see the projected rule reference, never the full payload.
const projectedWorkflowPayload = { rule: { ruleId: 'rule-1', spaceId: 'my-space', tags: [] } };

describe('RuleWorkflowSubscriber', () => {
  let bus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
  let workflowService: WorkflowService;
  let workflowsExtensions: jest.Mocked<WorkflowsExtensionsServerPluginStart>;
  let mockEmitEvent: jest.Mock;
  let loggerService: LoggerService;
  let mockLogger: jest.Mocked<Logger>;
  let subscriber: RuleWorkflowSubscriber;
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
    subscriber = new RuleWorkflowSubscriber(bus, workflowService, loggerService);
  });

  describe('event dispatch', () => {
    it('skips the workflow trigger for changes made by the internal user', async () => {
      subscriber.start();

      await handlerFor(bus, RULE_CREATED_EVENT_TYPE)(ruleCreatedEvent, {
        request,
        origin: { actor: 'internal', channel: 'system' },
      });

      expect(workflowsExtensions.getClient).not.toHaveBeenCalled();
      expect(mockEmitEvent).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it("forwards context.request through WorkflowService, with the binding's triggerId and the event payload", async () => {
      subscriber.start();

      await handlerFor(bus, RULE_CREATED_EVENT_TYPE)(ruleCreatedEvent, {
        request,
        origin: { actor: 'user', channel: 'api' },
      });

      // The acting user's request must reach getClient so the workflow runs with
      // the same credentials/space that changed the rule (RNA #504 requirement 3).
      expect(workflowsExtensions.getClient).toHaveBeenCalledWith(request);
      expect(mockEmitEvent).toHaveBeenCalledTimes(1);
      expect(mockEmitEvent).toHaveBeenCalledWith(RuleCreatedTriggerId, projectedWorkflowPayload);
    });

    it("catches WorkflowService failures, logs them with the binding's eventType, and does not let the rejection escape the handler", async () => {
      mockEmitEvent.mockRejectedValueOnce(new Error('workflows unreachable'));

      subscriber.start();

      await expect(
        handlerFor(bus, RULE_CREATED_EVENT_TYPE)(ruleCreatedEvent, {
          request,
          origin: { actor: 'user', channel: 'api' },
        })
      ).resolves.toBeUndefined();

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith('workflows unreachable', {
        labels: {
          event_type: RULE_CREATED_EVENT_TYPE,
          rule_id: ruleCreatedEvent.payload.ruleId,
          space_id: ruleCreatedEvent.payload.spaceId,
          code: ALERTING_LOG_CODES.EVENTS_RULE_WORKFLOW_SUBSCRIBER_FAILED,
        },
        error: expect.objectContaining({ message: 'workflows unreachable' }),
      });
    });
  });
});

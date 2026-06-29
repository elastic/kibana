/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { EventBus } from '../event_bus';
import type { AlertingDomainEvent, AlertingPublisherContext } from '../domain_events';
import { createRuleEventPublisher } from './rule_event_publisher.mock';
import type { RuleEventPublisher } from './rule_event_publisher';
import {
  RULE_DELETED_EVENT_TYPE,
  RULE_DISABLED_EVENT_TYPE,
  RULE_ENABLED_EVENT_TYPE,
  RULE_UPDATED_EVENT_TYPE,
} from './events';

describe('RuleEventPublisher', () => {
  let publisher: RuleEventPublisher;
  let eventBus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
  let request: KibanaRequest;

  beforeEach(() => {
    ({ publisher, eventBus } = createRuleEventPublisher());
    request = httpServerMock.createKibanaRequest();
  });

  describe('payload shape', () => {
    it('emits a `rule.created` event carrying only { ruleId, spaceId }', () => {
      publisher.emitRuleCreated(request, ['rule-1'], 'space-1');

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledWith(
        { type: 'rule.created', payload: { rule: { ruleId: 'rule-1', spaceId: 'space-1' } } },
        { request }
      );
    });
  });

  describe('emit methods', () => {
    const cases = [
      {
        name: 'emitRuleUpdated',
        type: RULE_UPDATED_EVENT_TYPE,
        emit: (p: RuleEventPublisher, r: KibanaRequest, ruleIds: string[], space: string) =>
          p.emitRuleUpdated(r, ruleIds, space),
      },
      {
        name: 'emitRuleDeleted',
        type: RULE_DELETED_EVENT_TYPE,
        emit: (p: RuleEventPublisher, r: KibanaRequest, ruleIds: string[], space: string) =>
          p.emitRuleDeleted(r, ruleIds, space),
      },
      {
        name: 'emitRuleEnabled',
        type: RULE_ENABLED_EVENT_TYPE,
        emit: (p: RuleEventPublisher, r: KibanaRequest, ruleIds: string[], space: string) =>
          p.emitRuleEnabled(r, ruleIds, space),
      },
      {
        name: 'emitRuleDisabled',
        type: RULE_DISABLED_EVENT_TYPE,
        emit: (p: RuleEventPublisher, r: KibanaRequest, ruleIds: string[], space: string) =>
          p.emitRuleDisabled(r, ruleIds, space),
      },
    ];

    describe.each(cases)('$name', ({ type, emit }) => {
      it('emits the matching event type with the { ruleId, spaceId } payload', () => {
        emit(publisher, request, ['rule-1'], 'space-1');

        expect(eventBus.publish).toHaveBeenCalledTimes(1);
        expect(eventBus.publish).toHaveBeenCalledWith(
          { type, payload: { rule: { ruleId: 'rule-1', spaceId: 'space-1' } } },
          { request }
        );
      });

      it('emits one event per rule id for bulk operations', () => {
        emit(publisher, request, ['rule-1', 'rule-2'], 'space-1');

        expect(eventBus.publish).toHaveBeenCalledTimes(2);
        expect(eventBus.publish.mock.calls[0][0]).toEqual(
          expect.objectContaining({
            type,
            payload: { rule: { ruleId: 'rule-1', spaceId: 'space-1' } },
          })
        );
        expect(eventBus.publish.mock.calls[1][0]).toEqual(
          expect.objectContaining({
            type,
            payload: { rule: { ruleId: 'rule-2', spaceId: 'space-1' } },
          })
        );
      });

      it('emits nothing for an empty id array', () => {
        emit(publisher, request, [], 'space-1');

        expect(eventBus.publish).not.toHaveBeenCalled();
      });
    });
  });
});

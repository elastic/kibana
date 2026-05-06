/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SAVED_OBJECT_REL_PRIMARY } from '@kbn/event-log-plugin/server';
import { createEventLogService } from '../services/event_log_service/event_log_service.mock';
import {
  RuleExecutorEventLogger,
  buildExecuteEvent,
  buildExecuteStartEvent,
} from './execution_event_logger';

const startedAt = new Date('2026-05-04T12:00:00.000Z');
const endedAt = new Date('2026-05-04T12:00:01.500Z');
const scheduled = new Date('2026-05-04T11:59:59.500Z');
const task = { id: 'task-1', scheduled };

describe('execution_event_logger', () => {
  describe('buildExecuteStartEvent', () => {
    it('builds the beacon document with provider, action, and rule SO ref', () => {
      const event = buildExecuteStartEvent({
        executionUuid: 'uuid-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        startedAt,
        task,
      });

      expect(event?.['@timestamp']).toBe('2026-05-04T12:00:00.000Z');
      expect(event?.event?.provider).toBe('alerting_v2');
      expect(event?.event?.action).toBe('execute-start');
      expect(event?.event?.start).toBe('2026-05-04T12:00:00.000Z');
      expect(event?.kibana?.space_ids).toEqual(['default']);
      expect(event?.kibana?.saved_objects).toEqual([
        {
          type: 'alerting_rule',
          id: 'rule-1',
          rel: SAVED_OBJECT_REL_PRIMARY,
          namespace: undefined,
        },
      ]);
      expect(event?.kibana?.alerting_v2?.rule_executor?.rule?.id).toBe('rule-1');
      expect(event?.kibana?.alerting_v2?.rule_executor?.execution?.uuid).toBe('uuid-1');
    });

    it('omits the namespace for the default space', () => {
      const event = buildExecuteStartEvent({
        executionUuid: 'uuid-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        startedAt,
        task,
      });

      expect(event?.kibana?.saved_objects?.[0]?.namespace).toBeUndefined();
    });

    it('sets the namespace for non-default spaces', () => {
      const event = buildExecuteStartEvent({
        executionUuid: 'uuid-1',
        ruleId: 'rule-1',
        spaceId: 'team-a',
        startedAt,
        task,
      });

      expect(event?.kibana?.saved_objects?.[0]?.namespace).toBe('team-a');
      expect(event?.kibana?.space_ids).toEqual(['team-a']);
    });

    it('populates kibana.task fields and computes schedule_delay in nanoseconds', () => {
      const event = buildExecuteStartEvent({
        executionUuid: 'uuid-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        startedAt,
        task,
      });

      expect(event?.kibana?.task?.id).toBe('task-1');
      expect(event?.kibana?.task?.type).toBe('alerting_v2:rule_executor');
      expect(event?.kibana?.task?.scheduled).toBe('2026-05-04T11:59:59.500Z');
      // startedAt − scheduled = 500ms = 500_000_000 ns
      expect(event?.kibana?.task?.schedule_delay).toBe(500 * 1_000_000);
    });

    it('clamps a negative schedule_delay to zero', () => {
      const event = buildExecuteStartEvent({
        executionUuid: 'uuid-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        startedAt,
        task: { id: 'task-1', scheduled: endedAt }, // scheduled after startedAt
      });

      expect(event?.kibana?.task?.schedule_delay).toBe(0);
    });
  });

  describe('buildExecuteEvent', () => {
    it('builds a success summary with metrics, rule attrs, and ECS outcome', () => {
      const event = buildExecuteEvent({
        executionUuid: 'uuid-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        startedAt,
        endedAt,
        task,
        status: 'success',
        rule: {
          id: 'rule-1',
          name: 'High CPU',
          kind: 'alert',
          tags: ['production'],
          query: ['FROM logs-* | STATS count = COUNT(*) BY host.name | WHERE count >= 1'],
        },
      });

      expect(event?.['@timestamp']).toBe('2026-05-04T12:00:01.500Z');
      expect(event?.event?.action).toBe('execute');
      expect(event?.event?.outcome).toBe('success');
      expect(event?.event?.start).toBe('2026-05-04T12:00:00.000Z');
      expect(event?.event?.end).toBe('2026-05-04T12:00:01.500Z');
      expect(event?.event?.duration).toBe(1500 * 1_000_000);

      expect(event?.kibana?.alerting_v2?.rule_executor?.execution?.status).toBe('success');
      expect(
        event?.kibana?.alerting_v2?.rule_executor?.execution?.metrics?.total_run_duration_ms
      ).toBe(1500);
      expect(event?.kibana?.alerting_v2?.rule_executor?.rule).toEqual({
        id: 'rule-1',
        name: 'High CPU',
        kind: 'alert',
        tags: ['production'],
        query: ['FROM logs-* | STATS count = COUNT(*) BY host.name | WHERE count >= 1'],
      });
    });

    it('omits rule.query when no query is supplied', () => {
      const event = buildExecuteEvent({
        executionUuid: 'uuid-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        startedAt,
        endedAt,
        task,
        status: 'success',
        rule: {
          id: 'rule-1',
          name: 'High CPU',
          kind: 'alert',
        },
      });

      expect(event?.kibana?.alerting_v2?.rule_executor?.rule).toEqual({
        id: 'rule-1',
        name: 'High CPU',
        kind: 'alert',
      });
    });

    it('omits rule.query when an empty array is supplied', () => {
      const event = buildExecuteEvent({
        executionUuid: 'uuid-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        startedAt,
        endedAt,
        task,
        status: 'success',
        rule: {
          id: 'rule-1',
          name: 'High CPU',
          kind: 'alert',
          query: [],
        },
      });

      expect(event?.kibana?.alerting_v2?.rule_executor?.rule).toEqual({
        id: 'rule-1',
        name: 'High CPU',
        kind: 'alert',
      });
    });

    it('serializes both evaluation and recovery queries when supplied', () => {
      const event = buildExecuteEvent({
        executionUuid: 'uuid-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        startedAt,
        endedAt,
        task,
        status: 'success',
        rule: {
          id: 'rule-1',
          name: 'High CPU',
          kind: 'alert',
          query: [
            'FROM logs-* | STATS count = COUNT(*) BY host.name | WHERE count >= 1',
            'FROM logs-* | WHERE recovered = true',
          ],
        },
      });

      expect(event?.kibana?.alerting_v2?.rule_executor?.rule?.query).toEqual([
        'FROM logs-* | STATS count = COUNT(*) BY host.name | WHERE count >= 1',
        'FROM logs-* | WHERE recovered = true',
      ]);
    });

    it('builds a failed summary with reason and error fields', () => {
      const event = buildExecuteEvent({
        executionUuid: 'uuid-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        startedAt,
        endedAt,
        task,
        status: 'failed',
        reason: 'query_failed',
        error: { message: 'syntax error', stackTrace: 'at line 1' },
      });

      expect(event?.event?.outcome).toBe('failure');
      expect(event?.event?.reason).toBe('query_failed');
      expect(event?.kibana?.alerting_v2?.rule_executor?.execution?.status).toBe('failed');
      expect(event?.error?.message).toBe('syntax error');
      expect(event?.error?.stack_trace).toBe('at line 1');
    });

    it('builds a timeout summary with cancelled.reason populated', () => {
      const event = buildExecuteEvent({
        executionUuid: 'uuid-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        startedAt,
        endedAt,
        task,
        status: 'timeout',
        reason: 'cancelled_timeout',
        cancelled: { step: 'execute_rule_query', reason: 'timeout' },
        error: { message: 'aborted' },
      });

      expect(event?.event?.outcome).toBe('failure');
      expect(event?.event?.reason).toBe('cancelled_timeout');
      expect(event?.kibana?.alerting_v2?.rule_executor?.execution?.status).toBe('timeout');
      expect(event?.kibana?.alerting_v2?.rule_executor?.execution?.cancelled).toEqual({
        step: 'execute_rule_query',
        reason: 'timeout',
      });
    });

    it('omits rule attributes other than id when no rule is supplied', () => {
      const event = buildExecuteEvent({
        executionUuid: 'uuid-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        startedAt,
        endedAt,
        task,
        status: 'failed',
        reason: 'rule_deleted',
      });

      expect(event?.kibana?.alerting_v2?.rule_executor?.rule).toEqual({ id: 'rule-1' });
    });

    it('clamps a negative duration to zero when endedAt precedes startedAt', () => {
      const event = buildExecuteEvent({
        executionUuid: 'uuid-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        startedAt: endedAt,
        endedAt: startedAt,
        task,
        status: 'success',
      });

      expect(event?.event?.duration).toBe(0);
      expect(
        event?.kibana?.alerting_v2?.rule_executor?.execution?.metrics?.total_run_duration_ms
      ).toBe(0);
    });

    it('populates kibana.task fields on the summary', () => {
      const event = buildExecuteEvent({
        executionUuid: 'uuid-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        startedAt,
        endedAt,
        task,
        status: 'success',
      });

      expect(event?.kibana?.task?.id).toBe('task-1');
      expect(event?.kibana?.task?.type).toBe('alerting_v2:rule_executor');
      expect(event?.kibana?.task?.scheduled).toBe('2026-05-04T11:59:59.500Z');
      expect(event?.kibana?.task?.schedule_delay).toBe(500 * 1_000_000);
    });

    it('merges a metrics snapshot under execution.metrics alongside total_run_duration_ms', () => {
      const event = buildExecuteEvent({
        executionUuid: 'uuid-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        startedAt,
        endedAt,
        task,
        status: 'success',
        metrics: {
          query: {
            number_of_searches: 2,
            total_search_duration_ms: 50,
            number_of_rows_returned: 10,
            number_of_batches: 1,
          },
          events_written: { breached: 1, recovered: 0, no_data: 0, total: 1 },
          recovery: { mode: 'no_breach', events_emitted: 0 },
        },
      });

      const metrics = event?.kibana?.alerting_v2?.rule_executor?.execution?.metrics;
      expect(metrics?.total_run_duration_ms).toBe(1500);
      expect(metrics?.query?.number_of_searches).toBe(2);
      expect(metrics?.query?.total_search_duration_ms).toBe(50);
      expect(metrics?.events_written?.breached).toBe(1);
      expect(metrics?.events_written?.total).toBe(1);
      expect(metrics?.recovery?.mode).toBe('no_breach');
    });
  });

  describe('RuleExecutorEventLogger', () => {
    it('forwards logExecuteStart and logExecute to the EventLogService', () => {
      const { eventLogService, mockEventLogger } = createEventLogService();
      const logger = new RuleExecutorEventLogger(eventLogService);

      logger.logExecuteStart({
        executionUuid: 'uuid-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        startedAt,
        task,
      });
      logger.logExecute({
        executionUuid: 'uuid-1',
        ruleId: 'rule-1',
        spaceId: 'default',
        startedAt,
        endedAt,
        task,
        status: 'success',
      });

      expect(mockEventLogger.logEvent).toHaveBeenCalledTimes(2);
      expect(mockEventLogger.logEvent.mock.calls[0][0]?.event?.action).toBe('execute-start');
      expect(mockEventLogger.logEvent.mock.calls[1][0]?.event?.action).toBe('execute');
    });

    it('swallows errors from EventLogService.logEvent so a logging failure never breaks a run', () => {
      const { eventLogService, mockEventLogger } = createEventLogService();
      mockEventLogger.logEvent.mockImplementation(() => {
        throw new Error('logger blew up');
      });
      const logger = new RuleExecutorEventLogger(eventLogService);

      expect(() =>
        logger.logExecuteStart({
          executionUuid: 'uuid-1',
          ruleId: 'rule-1',
          spaceId: 'default',
          startedAt,
          task,
        })
      ).not.toThrow();

      expect(() =>
        logger.logExecute({
          executionUuid: 'uuid-1',
          ruleId: 'rule-1',
          spaceId: 'default',
          startedAt,
          endedAt,
          task,
          status: 'success',
        })
      ).not.toThrow();
    });
  });
});

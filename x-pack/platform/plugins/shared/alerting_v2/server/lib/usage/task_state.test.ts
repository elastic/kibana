/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { stateSchemaByVersion } from './task_state';

describe('alerting v2 telemetry task state', () => {
  describe('v1', () => {
    const v1 = stateSchemaByVersion[1];

    it('fills the required fields when migrating an empty state', () => {
      const result = v1.up({});

      expect(result).toMatchObject({ has_errors: false, runs: 0, error_messages: undefined });
      expect(() => v1.schema.validate(result)).not.toThrow();
    });

    it('preserves known properties when migrating', () => {
      const state = { has_errors: true, error_messages: ['boom'], runs: 42, count_total: 7 };

      expect(v1.up(cloneDeep(state))).toMatchObject(state);
    });

    it('drops unknown properties when migrating', () => {
      expect(v1.up({ foo: true })).not.toHaveProperty('foo');
    });
  });

  describe('v2', () => {
    const v2 = stateSchemaByVersion[2];

    it('adds the agent-builder counters as undefined', () => {
      const result = v2.up({});

      expect(result).toMatchObject({
        count_agent_builder_assisted: undefined,
        action_policies_count_agent_builder_assisted: undefined,
      });
    });
  });

  describe('v3', () => {
    const v3 = stateSchemaByVersion[3];

    it('carries the query-shape counters forward', () => {
      const state = {
        count_by_query_format: { composed: 2, standalone: 3 },
        count_by_recovery_strategy: { no_breach: 1, query: 2, none: 3 },
        count_by_no_data_strategy: { last_known_status: 1, emit: 2, recover: 3, none: 4 },
      };

      expect(v3.up(cloneDeep(state))).toMatchObject(state);
    });
  });

  describe('v4', () => {
    const v4 = stateSchemaByVersion[4];

    const v3State = {
      has_errors: false,
      runs: 3,
      count_total: 20,
      count_by_query_format: { composed: 5, standalone: 15 },
      count_by_recovery_strategy: { no_breach: 9, query: 6, none: 5 },
      count_by_no_data_strategy: { last_known_status: 1, emit: 4, recover: 2, none: 13 },
    };

    it('removes count_by_query_format from the migrated state', () => {
      expect(v4.up(cloneDeep(v3State))).not.toHaveProperty('count_by_query_format');
    });

    it('clears the strategy counters, whose vocabularies no longer match', () => {
      const result = v4.up(cloneDeep(v3State));

      expect(result.count_by_recovery_strategy).toBeUndefined();
      expect(result.count_by_no_data_strategy).toBeUndefined();
    });

    it('preserves the counters it does not own', () => {
      expect(v4.up(cloneDeep(v3State))).toMatchObject({
        has_errors: false,
        runs: 3,
        count_total: 20,
      });
    });

    it('produces a state the v4 schema accepts', () => {
      expect(() => v4.schema.validate(v4.up(cloneDeep(v3State)))).not.toThrow();
    });

    it('accepts the new strategy vocabularies', () => {
      const state = {
        has_errors: false,
        runs: 1,
        count_by_recovery_strategy: { no_breach: 1, condition: 2, query: 3, manual: 4 },
        count_by_no_data_strategy: { ignore: 1, keep_last: 2, resolve: 3, alert: 4 },
      };

      expect(() => v4.schema.validate(state)).not.toThrow();
    });

    it('rejects a state that still carries count_by_query_format', () => {
      const state = {
        has_errors: false,
        runs: 1,
        count_by_query_format: { composed: 1, standalone: 2 },
      };

      expect(() => v4.schema.validate(state)).toThrow();
    });

    it('rejects the retired recovery strategy vocabulary', () => {
      const state = {
        has_errors: false,
        runs: 1,
        count_by_recovery_strategy: { none: 1 },
      };

      expect(() => v4.schema.validate(state)).toThrow();
    });

    it('rejects the retired no-data strategy vocabulary', () => {
      const state = {
        has_errors: false,
        runs: 1,
        count_by_no_data_strategy: { emit: 1 },
      };

      expect(() => v4.schema.validate(state)).toThrow();
    });
  });

  describe('v5', () => {
    const v5 = stateSchemaByVersion[5];

    const v4State = {
      has_errors: false,
      runs: 4,
      count_total: 20,
      count_agent_builder_assisted: 3,
      action_policies_count_agent_builder_assisted: 1,
    };

    it('removes the agent-builder counters from the migrated state', () => {
      const result = v5.up(cloneDeep(v4State));

      expect(result).not.toHaveProperty('count_agent_builder_assisted');
      expect(result).not.toHaveProperty('action_policies_count_agent_builder_assisted');
    });

    it('preserves the counters it does not own', () => {
      expect(v5.up(cloneDeep(v4State))).toMatchObject({
        has_errors: false,
        runs: 4,
        count_total: 20,
      });
    });

    it('produces a state the v5 schema accepts', () => {
      expect(() => v5.schema.validate(v5.up(cloneDeep(v4State)))).not.toThrow();
    });

    it('rejects a state that still carries the agent-builder counters', () => {
      expect(() => v5.schema.validate(v4State)).toThrow();
    });
  });

  describe('v6', () => {
    const v6 = stateSchemaByVersion[6];

    const v5State = {
      has_errors: false,
      runs: 5,
      action_policies_count: 7,
    };

    const newFields = {
      action_policies_count_by_status: { enabled: 5, disabled: 1, snoozed: 1 },
      action_policies_count_by_grouping_mode: { per_alert: 6, all: 1 },
      action_policies_count_by_throttle_strategy: { none: 4, every_time: 3 },
      action_policies_workflows_per_policy: { p50: 1, p99: 3, avg: 1.4 },
      action_policies_count_with_multiple_workflows: 2,
    };

    it('adds the action policy configuration counters as undefined', () => {
      const result = v6.up(cloneDeep(v5State));

      expect(result).toMatchObject({
        action_policies_count_by_status: undefined,
        action_policies_count_by_grouping_mode: undefined,
        action_policies_count_by_throttle_strategy: undefined,
        action_policies_workflows_per_policy: undefined,
        action_policies_count_with_multiple_workflows: undefined,
      });
    });

    it('preserves the counters it does not own', () => {
      expect(v6.up(cloneDeep(v5State))).toMatchObject(v5State);
    });

    it('produces a state the v6 schema accepts', () => {
      expect(() => v6.schema.validate(v6.up(cloneDeep(v5State)))).not.toThrow();
    });

    it('accepts the new counters, including null percentiles', () => {
      expect(() =>
        v6.schema.validate({
          ...v5State,
          ...newFields,
          action_policies_workflows_per_policy: { p50: null, p99: null, avg: null },
        })
      ).not.toThrow();
    });

    it('rejects a count_by value outside the known vocabulary', () => {
      expect(() =>
        v6.schema.validate({
          ...v5State,
          action_policies_count_by_throttle_strategy: { burst: 1 },
        })
      ).toThrow();
    });
  });

  describe('v7', () => {
    const v7 = stateSchemaByVersion[7];

    const v6State = {
      has_errors: false,
      runs: 6,
      action_policies_count: 7,
      action_policies_count_by_status: { enabled: 5, disabled: 2 },
    };

    const newFields = {
      dispatcher_alerts_count_by_outcome_24hr: { dispatched: 2, throttled: 3, unmatched: 2 },
      dispatcher_action_groups_count_by_outcome_24hr: { dispatched: 2, throttled: 3 },
      dispatcher_unique_alerts_dispatched_count_24hr: 2,
      dispatcher_workflow_executions_count_24hr: 2,
      dispatcher_unique_workflows_triggered_count_24hr: 1,
      dispatcher_notifying_executions_count_24hr: 2,
      dispatcher_notifying_spaces_count_24hr: 1,
      dispatcher_policies_count_by_activity_24hr: {
        dispatched: 2,
        throttled: 2,
        failing: 1,
        broken: 1,
      },
      dispatcher_action_groups_dispatched_per_policy_24hr: { p50: 1, p99: 1, avg: 1 },
      dispatcher_alerts_dispatched_per_policy_24hr: { p50: 1, p99: 1, avg: 1 },
      dispatcher_workflow_executions_per_policy_24hr: { p50: 1, p99: 1, avg: 1 },
      dispatcher_throttle_ratio_per_policy_24hr: { p50: 0.5, p99: 1, avg: 0.5 },
      dispatcher_uncovered_rules_count_24hr: 1,
      dispatcher_dispatch_failures_count_by_reason_24hr: { workflow_disabled: 2 },
    };

    it('adds the dispatcher activity counters as undefined', () => {
      const result = v7.up(cloneDeep(v6State));

      expect(result).toMatchObject(
        Object.fromEntries(Object.keys(newFields).map((key) => [key, undefined]))
      );
    });

    it('preserves the counters it does not own', () => {
      expect(v7.up(cloneDeep(v6State))).toMatchObject(v6State);
    });

    it('produces a state the v7 schema accepts', () => {
      expect(() => v7.schema.validate(v7.up(cloneDeep(v6State)))).not.toThrow();
    });

    it('accepts the new counters, including null distributions', () => {
      expect(() =>
        v7.schema.validate({
          ...v6State,
          ...newFields,
          dispatcher_throttle_ratio_per_policy_24hr: { p50: null, p99: null, avg: null },
        })
      ).not.toThrow();
    });

    it('rejects a count_by value outside the known vocabulary', () => {
      expect(() =>
        v7.schema.validate({
          ...v6State,
          dispatcher_dispatch_failures_count_by_reason_24hr: { timeout: 1 },
        })
      ).toThrow();
    });
  });

  describe('v8', () => {
    const v8 = stateSchemaByVersion[8];

    const v7State = {
      has_errors: false,
      runs: 7,
      dispatcher_uncovered_rules_count_24hr: 1,
    };

    const newFields = {
      dispatcher_action_groups_dispatched_per_policy_by_grouping_mode_24hr: {
        per_alert: { p50: 1, p99: 1, avg: 1 },
        per_field: { p50: 2, p99: 4, avg: 2.5 },
      },
      dispatcher_action_groups_throttled_count_by_strategy_24hr: {
        time_interval: 2,
        every_time: 1,
      },
    };

    it('adds the grouping mode and throttle strategy counters as undefined', () => {
      expect(v8.up(cloneDeep(v7State))).toMatchObject({
        dispatcher_action_groups_dispatched_per_policy_by_grouping_mode_24hr: undefined,
        dispatcher_action_groups_throttled_count_by_strategy_24hr: undefined,
      });
    });

    it('preserves the counters it does not own', () => {
      expect(v8.up(cloneDeep(v7State))).toMatchObject(v7State);
    });

    it('produces a state the v8 schema accepts', () => {
      expect(() => v8.schema.validate(v8.up(cloneDeep(v7State)))).not.toThrow();
    });

    it('accepts the new counters, including a null distribution for one grouping mode', () => {
      expect(() =>
        v8.schema.validate({
          ...v7State,
          ...newFields,
          dispatcher_action_groups_dispatched_per_policy_by_grouping_mode_24hr: {
            all: { p50: null, p99: null, avg: null },
          },
        })
      ).not.toThrow();
    });

    it('rejects a value outside the known vocabularies', () => {
      expect(() =>
        v8.schema.validate({
          ...v7State,
          dispatcher_action_groups_throttled_count_by_strategy_24hr: { none: 1 },
        })
      ).toThrow();
      expect(() =>
        v8.schema.validate({
          ...v7State,
          dispatcher_action_groups_dispatched_per_policy_by_grouping_mode_24hr: {
            per_rule: { p50: 1, p99: 1, avg: 1 },
          },
        })
      ).toThrow();
    });
  });
});

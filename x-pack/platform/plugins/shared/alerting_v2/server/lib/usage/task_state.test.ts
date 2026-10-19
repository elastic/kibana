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
});

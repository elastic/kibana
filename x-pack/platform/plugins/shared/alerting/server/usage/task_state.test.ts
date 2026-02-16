/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { stateSchemaByVersion } from './task_state';

describe('telemetry task state', () => {
  describe('v1', () => {
    const v1 = stateSchemaByVersion[1];
    it('should work on empty object when running the up migration', () => {
      const result = v1.up({});
      expect(result).toMatchInlineSnapshot(`
        Object {
          "avg_es_search_duration_by_type_per_day": Object {},
          "avg_es_search_duration_per_day": 0,
          "avg_execution_time_by_type_per_day": Object {},
          "avg_execution_time_per_day": 0,
          "avg_total_search_duration_by_type_per_day": Object {},
          "avg_total_search_duration_per_day": 0,
          "connectors_per_alert": Object {
            "avg": 0,
            "max": 0,
            "min": 0,
          },
          "count_active_by_type": Object {},
          "count_active_total": 0,
          "count_by_type": Object {},
          "count_connector_types_by_consumers": Object {},
          "count_disabled_total": 0,
          "count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day": Object {},
          "count_failed_and_unrecognized_rule_tasks_by_status_per_day": Object {},
          "count_failed_and_unrecognized_rule_tasks_per_day": 0,
          "count_rules_by_execution_status": Object {
            "error": 0,
            "success": 0,
            "warning": 0,
          },
          "count_rules_by_execution_status_per_day": Object {},
          "count_rules_by_notify_when": Object {
            "on_action_group_change": 0,
            "on_active_alert": 0,
            "on_throttle_interval": 0,
          },
          "count_rules_executions_by_type_per_day": Object {},
          "count_rules_executions_failured_by_reason_by_type_per_day": Object {},
          "count_rules_executions_failured_by_reason_per_day": Object {},
          "count_rules_executions_failured_per_day": 0,
          "count_rules_executions_per_day": 0,
          "count_rules_executions_timeouts_by_type_per_day": Object {},
          "count_rules_executions_timeouts_per_day": 0,
          "count_rules_muted": 0,
          "count_rules_namespaces": 0,
          "count_rules_snoozed": 0,
          "count_rules_with_muted_alerts": 0,
          "count_rules_with_tags": 0,
          "count_total": 0,
          "error_messages": undefined,
          "has_errors": false,
          "percentile_num_alerts_by_type_per_day": Object {},
          "percentile_num_alerts_per_day": Object {},
          "percentile_num_generated_actions_by_type_per_day": Object {},
          "percentile_num_generated_actions_per_day": Object {},
          "runs": 0,
          "schedule_time": Object {
            "avg": "0s",
            "max": "0s",
            "min": "0s",
          },
          "schedule_time_number_s": Object {
            "avg": 0,
            "max": 0,
            "min": 0,
          },
          "throttle_time": Object {
            "avg": "0s",
            "max": "0s",
            "min": "0s",
          },
          "throttle_time_number_s": Object {
            "avg": 0,
            "max": 0,
            "min": 0,
          },
        }
      `);
    });

    it(`shouldn't overwrite properties when running the up migration`, () => {
      const state = {
        avg_es_search_duration_by_type_per_day: { '.index-threshold': 1 },
        avg_es_search_duration_per_day: 2,
        avg_execution_time_by_type_per_day: { '.index-threshold': 3 },
        avg_execution_time_per_day: 4,
        avg_total_search_duration_by_type_per_day: { '.index-threshold': 5 },
        avg_total_search_duration_per_day: 6,
        connectors_per_alert: {
          avg: 7,
          max: 8,
          min: 9,
        },
        count_active_by_type: { '.index-threshold': 10 },
        count_active_total: 11,
        count_by_type: { '.index-threshold': 12 },
        count_connector_types_by_consumers: { '.index-threshold': 13 },
        count_disabled_total: 14,
        count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day: {
          '.index-threshold': 15,
        },
        count_failed_and_unrecognized_rule_tasks_by_status_per_day: { '.index-threshold': 16 },
        count_failed_and_unrecognized_rule_tasks_per_day: 17,
        count_rules_by_execution_status: {
          error: 18,
          success: 19,
          warning: 20,
        },
        count_rules_by_execution_status_per_day: { '.index-threshold': 21 },
        count_rules_by_notify_when: {
          on_action_group_change: 22,
          on_active_alert: 23,
          on_throttle_interval: 24,
        },
        count_rules_executions_by_type_per_day: { '.index-threshold': 25 },
        count_rules_executions_failured_by_reason_by_type_per_day: { '.index-threshold': 26 },
        count_rules_executions_failured_by_reason_per_day: { '.index-threshold': 27 },
        count_rules_executions_failured_per_day: 28,
        count_rules_executions_per_day: 29,
        count_rules_executions_timeouts_by_type_per_day: { '.index-threshold': 30 },
        count_rules_executions_timeouts_per_day: 31,
        count_rules_muted: 32,
        count_rules_namespaces: 33,
        count_rules_snoozed: 34,
        count_rules_with_muted_alerts: 35,
        count_rules_with_tags: 36,
        count_total: 37,
        error_messages: ['foo'],
        has_errors: true,
        percentile_num_alerts_by_type_per_day: { '.index-threshold': 38 },
        percentile_num_alerts_per_day: { '.index-threshold': 39 },
        percentile_num_generated_actions_by_type_per_day: { '.index-threshold': 40 },
        percentile_num_generated_actions_per_day: { '.index-threshold': 41 },
        runs: 42,
        schedule_time: {
          avg: '43s',
          max: '44s',
          min: '45s',
        },
        schedule_time_number_s: {
          avg: 46,
          max: 47,
          min: 48,
        },
        throttle_time: {
          avg: '49s',
          max: '50s',
          min: '51s',
        },
        throttle_time_number_s: {
          avg: 52,
          max: 53,
          min: 54,
        },
      };
      const result = v1.up(cloneDeep(state));
      expect(result).toEqual(state);
    });

    it('should drop unknown properties when running the up migration', () => {
      const state = { foo: true };
      const result = v1.up(state);
      expect(result).not.toHaveProperty('foo');
    });
  });

  describe('v2', () => {
    const v2 = stateSchemaByVersion[2];
    it('should work on empty object when running the up migration', () => {
      const result = v2.up({});
      expect(result).toMatchInlineSnapshot(`
        Object {
          "avg_es_search_duration_by_type_per_day": Object {},
          "avg_es_search_duration_per_day": 0,
          "avg_execution_time_by_type_per_day": Object {},
          "avg_execution_time_per_day": 0,
          "avg_total_search_duration_by_type_per_day": Object {},
          "avg_total_search_duration_per_day": 0,
          "connectors_per_alert": Object {
            "avg": 0,
            "max": 0,
            "min": 0,
          },
          "count_active_by_type": Object {},
          "count_active_total": 0,
          "count_alerts_by_rule_type": Object {},
          "count_alerts_total": 0,
          "count_by_type": Object {},
          "count_connector_types_by_consumers": Object {},
          "count_disabled_total": 0,
          "count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day": Object {},
          "count_failed_and_unrecognized_rule_tasks_by_status_per_day": Object {},
          "count_failed_and_unrecognized_rule_tasks_per_day": 0,
          "count_mw_total": 0,
          "count_mw_with_filter_alert_toggle_on": 0,
          "count_mw_with_repeat_toggle_on": 0,
          "count_rules_by_execution_status": Object {
            "error": 0,
            "success": 0,
            "warning": 0,
          },
          "count_rules_by_execution_status_per_day": Object {},
          "count_rules_by_notify_when": Object {
            "on_action_group_change": 0,
            "on_active_alert": 0,
            "on_throttle_interval": 0,
          },
          "count_rules_executions_by_type_per_day": Object {},
          "count_rules_executions_failured_by_reason_by_type_per_day": Object {},
          "count_rules_executions_failured_by_reason_per_day": Object {},
          "count_rules_executions_failured_per_day": 0,
          "count_rules_executions_per_day": 0,
          "count_rules_executions_timeouts_by_type_per_day": Object {},
          "count_rules_executions_timeouts_per_day": 0,
          "count_rules_muted": 0,
          "count_rules_namespaces": 0,
          "count_rules_snoozed": 0,
          "count_rules_with_muted_alerts": 0,
          "count_rules_with_tags": 0,
          "count_total": 0,
          "error_messages": undefined,
          "has_errors": false,
          "percentile_num_alerts_by_type_per_day": Object {},
          "percentile_num_alerts_per_day": Object {},
          "percentile_num_generated_actions_by_type_per_day": Object {},
          "percentile_num_generated_actions_per_day": Object {},
          "runs": 0,
          "schedule_time": Object {
            "avg": "0s",
            "max": "0s",
            "min": "0s",
          },
          "schedule_time_number_s": Object {
            "avg": 0,
            "max": 0,
            "min": 0,
          },
          "throttle_time": Object {
            "avg": "0s",
            "max": "0s",
            "min": "0s",
          },
          "throttle_time_number_s": Object {
            "avg": 0,
            "max": 0,
            "min": 0,
          },
        }
      `);
    });

    it(`shouldn't overwrite properties when running the up migration`, () => {
      const state = {
        avg_es_search_duration_by_type_per_day: { '.index-threshold': 1 },
        avg_es_search_duration_per_day: 2,
        avg_execution_time_by_type_per_day: { '.index-threshold': 3 },
        avg_execution_time_per_day: 4,
        avg_total_search_duration_by_type_per_day: { '.index-threshold': 5 },
        avg_total_search_duration_per_day: 6,
        connectors_per_alert: {
          avg: 7,
          max: 8,
          min: 9,
        },
        count_active_by_type: { '.index-threshold': 10 },
        count_active_total: 11,
        count_alerts_by_rule_type: {},
        count_alerts_total: 0,
        count_by_type: { '.index-threshold': 12 },
        count_connector_types_by_consumers: { '.index-threshold': 13 },
        count_disabled_total: 14,
        count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day: {
          '.index-threshold': 15,
        },
        count_failed_and_unrecognized_rule_tasks_by_status_per_day: { '.index-threshold': 16 },
        count_failed_and_unrecognized_rule_tasks_per_day: 17,
        count_mw_total: 0,
        count_mw_with_filter_alert_toggle_on: 0,
        count_mw_with_repeat_toggle_on: 0,
        count_rules_by_execution_status: {
          error: 18,
          success: 19,
          warning: 20,
        },
        count_rules_by_execution_status_per_day: { '.index-threshold': 21 },
        count_rules_by_notify_when: {
          on_action_group_change: 22,
          on_active_alert: 23,
          on_throttle_interval: 24,
        },
        count_rules_executions_by_type_per_day: { '.index-threshold': 25 },
        count_rules_executions_failured_by_reason_by_type_per_day: { '.index-threshold': 26 },
        count_rules_executions_failured_by_reason_per_day: { '.index-threshold': 27 },
        count_rules_executions_failured_per_day: 28,
        count_rules_executions_per_day: 29,
        count_rules_executions_timeouts_by_type_per_day: { '.index-threshold': 30 },
        count_rules_executions_timeouts_per_day: 31,
        count_rules_muted: 32,
        count_rules_namespaces: 33,
        count_rules_snoozed: 34,
        count_rules_with_muted_alerts: 35,
        count_rules_with_tags: 36,
        count_total: 37,
        error_messages: ['foo'],
        has_errors: true,
        percentile_num_alerts_by_type_per_day: { '.index-threshold': 38 },
        percentile_num_alerts_per_day: { '.index-threshold': 39 },
        percentile_num_generated_actions_by_type_per_day: { '.index-threshold': 40 },
        percentile_num_generated_actions_per_day: { '.index-threshold': 41 },
        runs: 42,
        schedule_time: {
          avg: '43s',
          max: '44s',
          min: '45s',
        },
        schedule_time_number_s: {
          avg: 46,
          max: 47,
          min: 48,
        },
        throttle_time: {
          avg: '49s',
          max: '50s',
          min: '51s',
        },
        throttle_time_number_s: {
          avg: 52,
          max: 53,
          min: 54,
        },
      };
      const result = v2.up(cloneDeep(state));
      expect(result).toEqual(state);
    });

    it('should drop unknown properties when running the up migration', () => {
      const state = { foo: true };
      const result = v2.up(state);
      expect(result).not.toHaveProperty('foo');
    });
  });

  describe('v3', () => {
    const v3 = stateSchemaByVersion[3];
    it('should work on empty object when running the up migration', () => {
      const result = v3.up({});
      expect(result).toMatchInlineSnapshot(`
        Object {
          "avg_es_search_duration_by_type_per_day": Object {},
          "avg_es_search_duration_per_day": 0,
          "avg_execution_time_by_type_per_day": Object {},
          "avg_execution_time_per_day": 0,
          "avg_total_search_duration_by_type_per_day": Object {},
          "avg_total_search_duration_per_day": 0,
          "connectors_per_alert": Object {
            "avg": 0,
            "max": 0,
            "min": 0,
          },
          "count_active_by_type": Object {},
          "count_active_total": 0,
          "count_alerts_by_rule_type": Object {},
          "count_alerts_total": 0,
          "count_by_type": Object {},
          "count_connector_types_by_consumers": Object {},
          "count_disabled_total": 0,
          "count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day": Object {},
          "count_failed_and_unrecognized_rule_tasks_by_status_per_day": Object {},
          "count_failed_and_unrecognized_rule_tasks_per_day": 0,
          "count_mw_total": 0,
          "count_mw_with_filter_alert_toggle_on": 0,
          "count_mw_with_repeat_toggle_on": 0,
          "count_rules_by_execution_status": Object {
            "error": 0,
            "success": 0,
            "warning": 0,
          },
          "count_rules_by_execution_status_per_day": Object {},
          "count_rules_by_notify_when": Object {
            "on_action_group_change": 0,
            "on_active_alert": 0,
            "on_throttle_interval": 0,
          },
          "count_rules_executions_by_type_per_day": Object {},
          "count_rules_executions_failured_by_reason_by_type_per_day": Object {},
          "count_rules_executions_failured_by_reason_per_day": Object {},
          "count_rules_executions_failured_per_day": 0,
          "count_rules_executions_per_day": 0,
          "count_rules_executions_timeouts_by_type_per_day": Object {},
          "count_rules_executions_timeouts_per_day": 0,
          "count_rules_muted": 0,
          "count_rules_namespaces": 0,
          "count_rules_snoozed": 0,
          "count_rules_with_investigation_guide": 0,
          "count_rules_with_linked_dashboards": 0,
          "count_rules_with_muted_alerts": 0,
          "count_rules_with_tags": 0,
          "count_total": 0,
          "error_messages": undefined,
          "has_errors": false,
          "percentile_num_alerts_by_type_per_day": Object {},
          "percentile_num_alerts_per_day": Object {},
          "percentile_num_generated_actions_by_type_per_day": Object {},
          "percentile_num_generated_actions_per_day": Object {},
          "runs": 0,
          "schedule_time": Object {
            "avg": "0s",
            "max": "0s",
            "min": "0s",
          },
          "schedule_time_number_s": Object {
            "avg": 0,
            "max": 0,
            "min": 0,
          },
          "throttle_time": Object {
            "avg": "0s",
            "max": "0s",
            "min": "0s",
          },
          "throttle_time_number_s": Object {
            "avg": 0,
            "max": 0,
            "min": 0,
          },
        }
      `);
    });

    it(`shouldn't overwrite properties when running the up migration`, () => {
      const state = {
        avg_es_search_duration_by_type_per_day: { '.index-threshold': 1 },
        avg_es_search_duration_per_day: 2,
        avg_execution_time_by_type_per_day: { '.index-threshold': 3 },
        avg_execution_time_per_day: 4,
        avg_total_search_duration_by_type_per_day: { '.index-threshold': 5 },
        avg_total_search_duration_per_day: 6,
        connectors_per_alert: {
          avg: 7,
          max: 8,
          min: 9,
        },
        count_active_by_type: { '.index-threshold': 10 },
        count_active_total: 11,
        count_alerts_by_rule_type: {},
        count_alerts_total: 0,
        count_by_type: { '.index-threshold': 12 },
        count_connector_types_by_consumers: { '.index-threshold': 13 },
        count_disabled_total: 14,
        count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day: {
          '.index-threshold': 15,
        },
        count_failed_and_unrecognized_rule_tasks_by_status_per_day: { '.index-threshold': 16 },
        count_failed_and_unrecognized_rule_tasks_per_day: 17,
        count_mw_total: 0,
        count_mw_with_filter_alert_toggle_on: 0,
        count_mw_with_repeat_toggle_on: 0,
        count_rules_by_execution_status: {
          error: 18,
          success: 19,
          warning: 20,
        },
        count_rules_by_execution_status_per_day: { '.index-threshold': 21 },
        count_rules_by_notify_when: {
          on_action_group_change: 22,
          on_active_alert: 23,
          on_throttle_interval: 24,
        },
        count_rules_executions_by_type_per_day: { '.index-threshold': 25 },
        count_rules_executions_failured_by_reason_by_type_per_day: { '.index-threshold': 26 },
        count_rules_executions_failured_by_reason_per_day: { '.index-threshold': 27 },
        count_rules_executions_failured_per_day: 28,
        count_rules_executions_per_day: 29,
        count_rules_executions_timeouts_by_type_per_day: { '.index-threshold': 30 },
        count_rules_executions_timeouts_per_day: 31,
        count_rules_muted: 32,
        count_rules_namespaces: 33,
        count_rules_snoozed: 34,
        count_rules_with_muted_alerts: 35,
        count_rules_with_tags: 36,
        count_rules_with_linked_dashboards: 10,
        count_rules_with_investigation_guide: 10,
        count_total: 37,
        error_messages: ['foo'],
        has_errors: true,
        percentile_num_alerts_by_type_per_day: { '.index-threshold': 38 },
        percentile_num_alerts_per_day: { '.index-threshold': 39 },
        percentile_num_generated_actions_by_type_per_day: { '.index-threshold': 40 },
        percentile_num_generated_actions_per_day: { '.index-threshold': 41 },
        runs: 42,
        schedule_time: {
          avg: '43s',
          max: '44s',
          min: '45s',
        },
        schedule_time_number_s: {
          avg: 46,
          max: 47,
          min: 48,
        },
        throttle_time: {
          avg: '49s',
          max: '50s',
          min: '51s',
        },
        throttle_time_number_s: {
          avg: 52,
          max: 53,
          min: 54,
        },
      };
      const result = v3.up(cloneDeep(state));
      expect(result).toEqual(state);
    });

    it('should drop unknown properties when running the up migration', () => {
      const state = { foo: true };
      const result = v3.up(state);
      expect(result).not.toHaveProperty('foo');
    });
  });

  describe('v4', () => {
    const v4 = stateSchemaByVersion[4];
    it('should work on empty object when running the up migration', () => {
      const result = v4.up({});
      expect(result).toMatchInlineSnapshot(`
        Object {
          "avg_es_search_duration_by_type_per_day": Object {},
          "avg_es_search_duration_per_day": 0,
          "avg_execution_time_by_type_per_day": Object {},
          "avg_execution_time_per_day": 0,
          "avg_total_search_duration_by_type_per_day": Object {},
          "avg_total_search_duration_per_day": 0,
          "connectors_per_alert": Object {
            "avg": 0,
            "max": 0,
            "min": 0,
          },
          "count_active_by_type": Object {},
          "count_active_total": 0,
          "count_alerts_by_rule_type": Object {},
          "count_alerts_total": 0,
          "count_by_type": Object {},
          "count_connector_types_by_consumers": Object {},
          "count_disabled_total": 0,
          "count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day": Object {},
          "count_failed_and_unrecognized_rule_tasks_by_status_per_day": Object {},
          "count_failed_and_unrecognized_rule_tasks_per_day": 0,
          "count_mw_total": 0,
          "count_mw_with_filter_alert_toggle_on": 0,
          "count_mw_with_repeat_toggle_on": 0,
          "count_rules_by_execution_status": Object {
            "error": 0,
            "success": 0,
            "warning": 0,
          },
          "count_rules_by_execution_status_per_day": Object {},
          "count_rules_by_notify_when": Object {
            "on_action_group_change": 0,
            "on_active_alert": 0,
            "on_throttle_interval": 0,
          },
          "count_rules_executions_by_type_per_day": Object {},
          "count_rules_executions_failured_by_reason_by_type_per_day": Object {},
          "count_rules_executions_failured_by_reason_per_day": Object {},
          "count_rules_executions_failured_per_day": 0,
          "count_rules_executions_per_day": 0,
          "count_rules_executions_timeouts_by_type_per_day": Object {},
          "count_rules_executions_timeouts_per_day": 0,
          "count_rules_muted": 0,
          "count_rules_muted_by_type": Object {},
          "count_rules_namespaces": 0,
          "count_rules_snoozed": 0,
          "count_rules_snoozed_by_type": Object {},
          "count_rules_with_investigation_guide": 0,
          "count_rules_with_linked_dashboards": 0,
          "count_rules_with_muted_alerts": 0,
          "count_rules_with_tags": 0,
          "count_total": 0,
          "error_messages": undefined,
          "has_errors": false,
          "percentile_num_alerts_by_type_per_day": Object {},
          "percentile_num_alerts_per_day": Object {},
          "percentile_num_generated_actions_by_type_per_day": Object {},
          "percentile_num_generated_actions_per_day": Object {},
          "runs": 0,
          "schedule_time": Object {
            "avg": "0s",
            "max": "0s",
            "min": "0s",
          },
          "schedule_time_number_s": Object {
            "avg": 0,
            "max": 0,
            "min": 0,
          },
          "throttle_time": Object {
            "avg": "0s",
            "max": "0s",
            "min": "0s",
          },
          "throttle_time_number_s": Object {
            "avg": 0,
            "max": 0,
            "min": 0,
          },
        }
      `);
    });

    it(`shouldn't overwrite properties when running the up migration`, () => {
      const state = {
        avg_es_search_duration_by_type_per_day: { '.index-threshold': 1 },
        avg_es_search_duration_per_day: 2,
        avg_execution_time_by_type_per_day: { '.index-threshold': 3 },
        avg_execution_time_per_day: 4,
        avg_total_search_duration_by_type_per_day: { '.index-threshold': 5 },
        avg_total_search_duration_per_day: 6,
        connectors_per_alert: {
          avg: 7,
          max: 8,
          min: 9,
        },
        count_active_by_type: { '.index-threshold': 10 },
        count_active_total: 11,
        count_alerts_by_rule_type: {},
        count_alerts_total: 0,
        count_by_type: { '.index-threshold': 12 },
        count_connector_types_by_consumers: { '.index-threshold': 13 },
        count_disabled_total: 14,
        count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day: {
          '.index-threshold': 15,
        },
        count_failed_and_unrecognized_rule_tasks_by_status_per_day: { '.index-threshold': 16 },
        count_failed_and_unrecognized_rule_tasks_per_day: 17,
        count_mw_total: 0,
        count_mw_with_filter_alert_toggle_on: 0,
        count_mw_with_repeat_toggle_on: 0,
        count_rules_by_execution_status: {
          error: 18,
          success: 19,
          warning: 20,
        },
        count_rules_by_execution_status_per_day: { '.index-threshold': 21 },
        count_rules_by_notify_when: {
          on_action_group_change: 22,
          on_active_alert: 23,
          on_throttle_interval: 24,
        },
        count_rules_executions_by_type_per_day: { '.index-threshold': 25 },
        count_rules_executions_failured_by_reason_by_type_per_day: { '.index-threshold': 26 },
        count_rules_executions_failured_by_reason_per_day: { '.index-threshold': 27 },
        count_rules_executions_failured_per_day: 28,
        count_rules_executions_per_day: 29,
        count_rules_executions_timeouts_by_type_per_day: { '.index-threshold': 30 },
        count_rules_executions_timeouts_per_day: 31,
        count_rules_muted: 32,
        count_rules_muted_by_type: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          observability__rules__custom_threshold: 5,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          slo__rules__burnRate: 4,
        },
        count_rules_namespaces: 33,
        count_rules_snoozed: 34,
        count_rules_snoozed_by_type: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          observability__rules__custom_threshold: 2,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          slo__rules__burnRate: 1,
        },
        count_rules_with_muted_alerts: 35,
        count_rules_with_tags: 36,
        count_rules_with_linked_dashboards: 10,
        count_rules_with_investigation_guide: 10,
        count_total: 37,
        error_messages: ['foo'],
        has_errors: true,
        percentile_num_alerts_by_type_per_day: { '.index-threshold': 38 },
        percentile_num_alerts_per_day: { '.index-threshold': 39 },
        percentile_num_generated_actions_by_type_per_day: { '.index-threshold': 40 },
        percentile_num_generated_actions_per_day: { '.index-threshold': 41 },
        runs: 42,
        schedule_time: {
          avg: '43s',
          max: '44s',
          min: '45s',
        },
        schedule_time_number_s: {
          avg: 46,
          max: 47,
          min: 48,
        },
        throttle_time: {
          avg: '49s',
          max: '50s',
          min: '51s',
        },
        throttle_time_number_s: {
          avg: 52,
          max: 53,
          min: 54,
        },
      };
      const result = v4.up(cloneDeep(state));
      expect(result).toEqual(state);
    });

    it('should drop unknown properties when running the up migration', () => {
      const state = { foo: true };
      const result = v4.up(state);
      expect(result).not.toHaveProperty('foo');
    });
  });

  describe('v5', () => {
    const v5 = stateSchemaByVersion[5];
    it('should work on empty object when running the up migration', () => {
      const result = v5.up({});
      expect(result).toMatchInlineSnapshot(`
        Object {
          "avg_es_search_duration_by_type_per_day": Object {},
          "avg_es_search_duration_per_day": 0,
          "avg_execution_time_by_type_per_day": Object {},
          "avg_execution_time_per_day": 0,
          "avg_total_search_duration_by_type_per_day": Object {},
          "avg_total_search_duration_per_day": 0,
          "connectors_per_alert": Object {
            "avg": 0,
            "max": 0,
            "min": 0,
          },
          "count_active_by_type": Object {},
          "count_active_total": 0,
          "count_alerts_by_rule_type": Object {},
          "count_alerts_total": 0,
          "count_by_type": Object {},
          "count_connector_types_by_consumers": Object {},
          "count_disabled_total": 0,
          "count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day": Object {},
          "count_failed_and_unrecognized_rule_tasks_by_status_per_day": Object {},
          "count_failed_and_unrecognized_rule_tasks_per_day": 0,
          "count_ignored_fields_by_rule_type": Object {},
          "count_mw_total": 0,
          "count_mw_with_filter_alert_toggle_on": 0,
          "count_mw_with_repeat_toggle_on": 0,
          "count_rules_by_execution_status": Object {
            "error": 0,
            "success": 0,
            "warning": 0,
          },
          "count_rules_by_execution_status_per_day": Object {},
          "count_rules_by_notify_when": Object {
            "on_action_group_change": 0,
            "on_active_alert": 0,
            "on_throttle_interval": 0,
          },
          "count_rules_executions_by_type_per_day": Object {},
          "count_rules_executions_failured_by_reason_by_type_per_day": Object {},
          "count_rules_executions_failured_by_reason_per_day": Object {},
          "count_rules_executions_failured_per_day": 0,
          "count_rules_executions_per_day": 0,
          "count_rules_executions_timeouts_by_type_per_day": Object {},
          "count_rules_executions_timeouts_per_day": 0,
          "count_rules_muted": 0,
          "count_rules_muted_by_type": Object {},
          "count_rules_namespaces": 0,
          "count_rules_snoozed": 0,
          "count_rules_snoozed_by_type": Object {},
          "count_rules_with_investigation_guide": 0,
          "count_rules_with_linked_dashboards": 0,
          "count_rules_with_muted_alerts": 0,
          "count_rules_with_tags": 0,
          "count_total": 0,
          "error_messages": undefined,
          "has_errors": false,
          "percentile_num_alerts_by_type_per_day": Object {},
          "percentile_num_alerts_per_day": Object {},
          "percentile_num_generated_actions_by_type_per_day": Object {},
          "percentile_num_generated_actions_per_day": Object {},
          "runs": 0,
          "schedule_time": Object {
            "avg": "0s",
            "max": "0s",
            "min": "0s",
          },
          "schedule_time_number_s": Object {
            "avg": 0,
            "max": 0,
            "min": 0,
          },
          "throttle_time": Object {
            "avg": "0s",
            "max": "0s",
            "min": "0s",
          },
          "throttle_time_number_s": Object {
            "avg": 0,
            "max": 0,
            "min": 0,
          },
        }
      `);
    });

    it(`shouldn't overwrite properties when running the up migration`, () => {
      const state = {
        avg_es_search_duration_by_type_per_day: { '.index-threshold': 1 },
        avg_es_search_duration_per_day: 2,
        avg_execution_time_by_type_per_day: { '.index-threshold': 3 },
        avg_execution_time_per_day: 4,
        avg_total_search_duration_by_type_per_day: { '.index-threshold': 5 },
        avg_total_search_duration_per_day: 6,
        connectors_per_alert: {
          avg: 7,
          max: 8,
          min: 9,
        },
        count_active_by_type: { '.index-threshold': 10 },
        count_active_total: 11,
        count_alerts_by_rule_type: {},
        count_alerts_total: 0,
        count_by_type: { '.index-threshold': 12 },
        count_connector_types_by_consumers: { '.index-threshold': 13 },
        count_disabled_total: 14,
        count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day: {
          '.index-threshold': 15,
        },
        count_failed_and_unrecognized_rule_tasks_by_status_per_day: { '.index-threshold': 16 },
        count_failed_and_unrecognized_rule_tasks_per_day: 17,
        count_ignored_fields_by_rule_type: {},
        count_mw_total: 0,
        count_mw_with_filter_alert_toggle_on: 0,
        count_mw_with_repeat_toggle_on: 0,
        count_rules_by_execution_status: {
          error: 18,
          success: 19,
          warning: 20,
        },
        count_rules_by_execution_status_per_day: { '.index-threshold': 21 },
        count_rules_by_notify_when: {
          on_action_group_change: 22,
          on_active_alert: 23,
          on_throttle_interval: 24,
        },
        count_rules_executions_by_type_per_day: { '.index-threshold': 25 },
        count_rules_executions_failured_by_reason_by_type_per_day: { '.index-threshold': 26 },
        count_rules_executions_failured_by_reason_per_day: { '.index-threshold': 27 },
        count_rules_executions_failured_per_day: 28,
        count_rules_executions_per_day: 29,
        count_rules_executions_timeouts_by_type_per_day: { '.index-threshold': 30 },
        count_rules_executions_timeouts_per_day: 31,
        count_rules_muted: 32,
        count_rules_muted_by_type: {},
        count_rules_namespaces: 33,
        count_rules_snoozed: 34,
        count_rules_snoozed_by_type: {},
        count_rules_with_muted_alerts: 35,
        count_rules_with_tags: 36,
        count_rules_with_linked_dashboards: 10,
        count_rules_with_investigation_guide: 10,
        count_total: 37,
        error_messages: ['foo'],
        has_errors: true,
        percentile_num_alerts_by_type_per_day: { '.index-threshold': 38 },
        percentile_num_alerts_per_day: { '.index-threshold': 39 },
        percentile_num_generated_actions_by_type_per_day: { '.index-threshold': 40 },
        percentile_num_generated_actions_per_day: { '.index-threshold': 41 },
        runs: 42,
        schedule_time: {
          avg: '43s',
          max: '44s',
          min: '45s',
        },
        schedule_time_number_s: {
          avg: 46,
          max: 47,
          min: 48,
        },
        throttle_time: {
          avg: '49s',
          max: '50s',
          min: '51s',
        },
        throttle_time_number_s: {
          avg: 52,
          max: 53,
          min: 54,
        },
      };
      const result = v5.up(cloneDeep(state));
      expect(result).toEqual(state);
    });

    it('should drop unknown properties when running the up migration', () => {
      const state = { foo: true };
      const result = v5.up(state);
      expect(result).not.toHaveProperty('foo');
    });
  });

  describe('v6', () => {
    const v6 = stateSchemaByVersion[6];
    it('should work on empty object when running the up migration', () => {
      const result = v6.up({});
      expect(result).toHaveProperty('count_backfill_executions', 0);
      expect(result).toHaveProperty('count_backfills_by_execution_status_per_day', {});
      expect(result).toHaveProperty('count_gaps', 0);
      expect(result).toHaveProperty('total_unfilled_gap_duration_ms', 0);
      expect(result).toHaveProperty('total_filled_gap_duration_ms', 0);
    });

    it('should drop unknown properties when running the up migration', () => {
      const state = { foo: true };
      const result = v6.up(state);
      expect(result).not.toHaveProperty('foo');
    });
  });

  describe('v7', () => {
    const v7 = stateSchemaByVersion[7];
    it('should work on empty object when running the up migration', () => {
      const result = v7.up({});
      expect(result).toHaveProperty('count_rules_with_api_key_created_by_user', 0);
    });

    it(`shouldn't overwrite properties when running the up migration`, () => {
      const state = {
        avg_es_search_duration_by_type_per_day: { '.index-threshold': 1 },
        avg_es_search_duration_per_day: 2,
        avg_execution_time_by_type_per_day: { '.index-threshold': 3 },
        avg_execution_time_per_day: 4,
        avg_total_search_duration_by_type_per_day: { '.index-threshold': 5 },
        avg_total_search_duration_per_day: 6,
        connectors_per_alert: {
          avg: 7,
          max: 8,
          min: 9,
        },
        count_active_by_type: { '.index-threshold': 10 },
        count_active_total: 11,
        count_alerts_by_rule_type: {},
        count_alerts_total: 0,
        count_by_type: { '.index-threshold': 12 },
        count_connector_types_by_consumers: { '.index-threshold': 13 },
        count_disabled_total: 14,
        count_failed_and_unrecognized_rule_tasks_by_status_by_type_per_day: {
          '.index-threshold': 15,
        },
        count_failed_and_unrecognized_rule_tasks_by_status_per_day: { '.index-threshold': 16 },
        count_failed_and_unrecognized_rule_tasks_per_day: 17,
        count_ignored_fields_by_rule_type: {},
        count_mw_total: 0,
        count_mw_with_filter_alert_toggle_on: 0,
        count_mw_with_repeat_toggle_on: 0,
        count_rules_by_execution_status: {
          error: 18,
          success: 19,
          warning: 20,
        },
        count_rules_by_execution_status_per_day: { '.index-threshold': 21 },
        count_rules_by_notify_when: {
          on_action_group_change: 22,
          on_active_alert: 23,
          on_throttle_interval: 24,
        },
        count_rules_executions_by_type_per_day: { '.index-threshold': 25 },
        count_rules_executions_failured_by_reason_by_type_per_day: { '.index-threshold': 26 },
        count_rules_executions_failured_by_reason_per_day: { '.index-threshold': 27 },
        count_rules_executions_failured_per_day: 28,
        count_rules_executions_per_day: 29,
        count_rules_executions_timeouts_by_type_per_day: { '.index-threshold': 30 },
        count_rules_executions_timeouts_per_day: 31,
        count_rules_muted: 32,
        count_rules_muted_by_type: {},
        count_rules_namespaces: 33,
        count_rules_snoozed: 34,
        count_rules_snoozed_by_type: {},
        count_rules_with_muted_alerts: 35,
        count_rules_with_tags: 36,
        count_rules_with_linked_dashboards: 10,
        count_rules_with_investigation_guide: 10,
        count_rules_with_api_key_created_by_user: 5,
        count_backfill_executions: 20,
        count_backfills_by_execution_status_per_day: {},
        count_gaps: 10,
        total_unfilled_gap_duration_ms: 100,
        total_filled_gap_duration_ms: 200,
        count_total: 37,
        error_messages: ['foo'],
        has_errors: true,
        percentile_num_alerts_by_type_per_day: { '.index-threshold': 38 },
        percentile_num_alerts_per_day: { '.index-threshold': 39 },
        percentile_num_generated_actions_by_type_per_day: { '.index-threshold': 40 },
        percentile_num_generated_actions_per_day: { '.index-threshold': 41 },
        runs: 42,
        schedule_time: {
          avg: '43s',
          max: '44s',
          min: '45s',
        },
        schedule_time_number_s: {
          avg: 46,
          max: 47,
          min: 48,
        },
        throttle_time: {
          avg: '49s',
          max: '50s',
          min: '51s',
        },
        throttle_time_number_s: {
          avg: 52,
          max: 53,
          min: 54,
        },
      };
      const result = v7.up(cloneDeep(state));
      expect(result).toEqual(state);
    });

    it('should drop unknown properties when running the up migration', () => {
      const state = { foo: true };
      const result = v7.up(state);
      expect(result).not.toHaveProperty('foo');
    });
  });

  describe('v8', () => {
    const v8 = stateSchemaByVersion[8];
    it('should work on empty object when running the up migration', () => {
      const result = v8.up({});
      expect(result).toHaveProperty('count_rules_with_elasticagent_tag', 0);
      expect(result).toHaveProperty('count_rules_with_elasticagent_tag_by_type', {});
    });
    it(`shouldn't overwrite properties when running the up migration`, () => {
      const state = {
        count_rules_with_elasticagent_tag: 5,
        count_rules_with_elasticagent_tag_by_type: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 3,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          metrics__alert__threshold: 2,
        },
      };
      const result = v8.up(cloneDeep(state));
      expect(result.count_rules_with_elasticagent_tag).toEqual(5);
      expect(result.count_rules_with_elasticagent_tag_by_type).toEqual({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        logs__alert__document__count: 3,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        metrics__alert__threshold: 2,
      });
    });
    it('should drop unknown properties when running the up migration', () => {
      const state = { foo: true };
      const result = v8.up(state);
      expect(result).not.toHaveProperty('foo');
    });
  });
});

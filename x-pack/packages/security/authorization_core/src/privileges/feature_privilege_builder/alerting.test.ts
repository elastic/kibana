/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureKibanaPrivileges } from '@kbn/features-plugin/server';
import { KibanaFeature } from '@kbn/features-plugin/server';

import { FeaturePrivilegeAlertingBuilder } from './alerting';
import { Actions } from '../../actions';

describe(`feature_privilege_builder`, () => {
  describe(`alerting`, () => {
    test('grants no privileges by default', () => {
      const actions = new Actions();
      const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

      const privilege: FeatureKibanaPrivileges = {
        alerting: {
          rule: {
            all: [],
            read: [],
          },
          alert: {
            all: [],
            read: [],
          },
        },
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      };

      const feature = new KibanaFeature({
        id: 'my-feature',
        name: 'my-feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: {
          all: privilege,
          read: privilege,
        },
      });

      expect(alertingFeaturePrivileges.getActions(privilege, feature)).toEqual([]);
    });

    describe(`within feature`, () => {
      test('grants `read` privileges to rules under feature consumer', () => {
        const actions = new Actions();
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            rule: {
              all: [],
              read: [{ ruleTypeId: 'alert-type', consumers: ['my-consumer'] }],
            },
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        };

        const feature = new KibanaFeature({
          id: 'my-feature',
          name: 'my-feature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: privilege,
            read: privilege,
          },
        });

        expect(alertingFeaturePrivileges.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "alerting:alert-type/my-consumer/rule/get",
            "alerting:alert-type/my-consumer/rule/getRuleState",
            "alerting:alert-type/my-consumer/rule/getAlertSummary",
            "alerting:alert-type/my-consumer/rule/getExecutionLog",
            "alerting:alert-type/my-consumer/rule/getActionErrorLog",
            "alerting:alert-type/my-consumer/rule/find",
            "alerting:alert-type/my-consumer/rule/getRuleExecutionKPI",
            "alerting:alert-type/my-consumer/rule/getBackfill",
            "alerting:alert-type/my-consumer/rule/findBackfill",
          ]
        `);
      });

      test('grants `read` privileges to alerts under feature consumer', () => {
        const actions = new Actions();
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            alert: {
              all: [],
              read: [{ ruleTypeId: 'alert-type', consumers: ['my-consumer'] }],
            },
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        };

        const feature = new KibanaFeature({
          id: 'my-feature',
          name: 'my-feature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: privilege,
            read: privilege,
          },
        });

        expect(alertingFeaturePrivileges.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "alerting:alert-type/my-consumer/alert/get",
            "alerting:alert-type/my-consumer/alert/find",
            "alerting:alert-type/my-consumer/alert/getAuthorizedAlertsIndices",
            "alerting:alert-type/my-consumer/alert/getAlertSummary",
          ]
        `);
      });

      test('grants `read` privileges to rules and alerts under feature consumer', () => {
        const actions = new Actions();
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            rule: {
              all: [],
              read: [{ ruleTypeId: 'alert-type', consumers: ['my-consumer'] }],
            },
            alert: {
              all: [],
              read: [{ ruleTypeId: 'alert-type', consumers: ['my-consumer'] }],
            },
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        };

        const feature = new KibanaFeature({
          id: 'my-feature',
          name: 'my-feature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: privilege,
            read: privilege,
          },
        });

        expect(alertingFeaturePrivileges.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "alerting:alert-type/my-consumer/rule/get",
            "alerting:alert-type/my-consumer/rule/getRuleState",
            "alerting:alert-type/my-consumer/rule/getAlertSummary",
            "alerting:alert-type/my-consumer/rule/getExecutionLog",
            "alerting:alert-type/my-consumer/rule/getActionErrorLog",
            "alerting:alert-type/my-consumer/rule/find",
            "alerting:alert-type/my-consumer/rule/getRuleExecutionKPI",
            "alerting:alert-type/my-consumer/rule/getBackfill",
            "alerting:alert-type/my-consumer/rule/findBackfill",
            "alerting:alert-type/my-consumer/alert/get",
            "alerting:alert-type/my-consumer/alert/find",
            "alerting:alert-type/my-consumer/alert/getAuthorizedAlertsIndices",
            "alerting:alert-type/my-consumer/alert/getAlertSummary",
          ]
        `);
      });

      test('grants `all` privileges to rules under feature consumer', () => {
        const actions = new Actions();
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            rule: {
              all: [{ ruleTypeId: 'alert-type', consumers: ['my-consumer'] }],
              read: [],
            },
          },

          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        };

        const feature = new KibanaFeature({
          id: 'my-feature',
          name: 'my-feature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: privilege,
            read: privilege,
          },
        });

        expect(alertingFeaturePrivileges.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "alerting:alert-type/my-consumer/rule/get",
            "alerting:alert-type/my-consumer/rule/getRuleState",
            "alerting:alert-type/my-consumer/rule/getAlertSummary",
            "alerting:alert-type/my-consumer/rule/getExecutionLog",
            "alerting:alert-type/my-consumer/rule/getActionErrorLog",
            "alerting:alert-type/my-consumer/rule/find",
            "alerting:alert-type/my-consumer/rule/getRuleExecutionKPI",
            "alerting:alert-type/my-consumer/rule/getBackfill",
            "alerting:alert-type/my-consumer/rule/findBackfill",
            "alerting:alert-type/my-consumer/rule/create",
            "alerting:alert-type/my-consumer/rule/delete",
            "alerting:alert-type/my-consumer/rule/update",
            "alerting:alert-type/my-consumer/rule/updateApiKey",
            "alerting:alert-type/my-consumer/rule/enable",
            "alerting:alert-type/my-consumer/rule/disable",
            "alerting:alert-type/my-consumer/rule/muteAll",
            "alerting:alert-type/my-consumer/rule/unmuteAll",
            "alerting:alert-type/my-consumer/rule/muteAlert",
            "alerting:alert-type/my-consumer/rule/unmuteAlert",
            "alerting:alert-type/my-consumer/rule/snooze",
            "alerting:alert-type/my-consumer/rule/bulkEdit",
            "alerting:alert-type/my-consumer/rule/bulkDelete",
            "alerting:alert-type/my-consumer/rule/bulkEnable",
            "alerting:alert-type/my-consumer/rule/bulkDisable",
            "alerting:alert-type/my-consumer/rule/unsnooze",
            "alerting:alert-type/my-consumer/rule/runSoon",
            "alerting:alert-type/my-consumer/rule/scheduleBackfill",
            "alerting:alert-type/my-consumer/rule/deleteBackfill",
          ]
        `);
      });

      test('grants `all` privileges to alerts under feature consumer', () => {
        const actions = new Actions();
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            alert: {
              all: [{ ruleTypeId: 'alert-type', consumers: ['my-consumer'] }],
              read: [],
            },
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        };

        const feature = new KibanaFeature({
          id: 'my-feature',
          name: 'my-feature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: privilege,
            read: privilege,
          },
        });

        expect(alertingFeaturePrivileges.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "alerting:alert-type/my-consumer/alert/get",
            "alerting:alert-type/my-consumer/alert/find",
            "alerting:alert-type/my-consumer/alert/getAuthorizedAlertsIndices",
            "alerting:alert-type/my-consumer/alert/getAlertSummary",
            "alerting:alert-type/my-consumer/alert/update",
          ]
        `);
      });

      test('grants `all` privileges to rules and alerts under feature consumer', () => {
        const actions = new Actions();
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            rule: {
              all: [{ ruleTypeId: 'alert-type', consumers: ['my-consumer'] }],
              read: [],
            },
            alert: {
              all: [{ ruleTypeId: 'alert-type', consumers: ['my-consumer'] }],
              read: [],
            },
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        };

        const feature = new KibanaFeature({
          id: 'my-feature',
          name: 'my-feature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: privilege,
            read: privilege,
          },
        });

        expect(alertingFeaturePrivileges.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "alerting:alert-type/my-consumer/rule/get",
            "alerting:alert-type/my-consumer/rule/getRuleState",
            "alerting:alert-type/my-consumer/rule/getAlertSummary",
            "alerting:alert-type/my-consumer/rule/getExecutionLog",
            "alerting:alert-type/my-consumer/rule/getActionErrorLog",
            "alerting:alert-type/my-consumer/rule/find",
            "alerting:alert-type/my-consumer/rule/getRuleExecutionKPI",
            "alerting:alert-type/my-consumer/rule/getBackfill",
            "alerting:alert-type/my-consumer/rule/findBackfill",
            "alerting:alert-type/my-consumer/rule/create",
            "alerting:alert-type/my-consumer/rule/delete",
            "alerting:alert-type/my-consumer/rule/update",
            "alerting:alert-type/my-consumer/rule/updateApiKey",
            "alerting:alert-type/my-consumer/rule/enable",
            "alerting:alert-type/my-consumer/rule/disable",
            "alerting:alert-type/my-consumer/rule/muteAll",
            "alerting:alert-type/my-consumer/rule/unmuteAll",
            "alerting:alert-type/my-consumer/rule/muteAlert",
            "alerting:alert-type/my-consumer/rule/unmuteAlert",
            "alerting:alert-type/my-consumer/rule/snooze",
            "alerting:alert-type/my-consumer/rule/bulkEdit",
            "alerting:alert-type/my-consumer/rule/bulkDelete",
            "alerting:alert-type/my-consumer/rule/bulkEnable",
            "alerting:alert-type/my-consumer/rule/bulkDisable",
            "alerting:alert-type/my-consumer/rule/unsnooze",
            "alerting:alert-type/my-consumer/rule/runSoon",
            "alerting:alert-type/my-consumer/rule/scheduleBackfill",
            "alerting:alert-type/my-consumer/rule/deleteBackfill",
            "alerting:alert-type/my-consumer/alert/get",
            "alerting:alert-type/my-consumer/alert/find",
            "alerting:alert-type/my-consumer/alert/getAuthorizedAlertsIndices",
            "alerting:alert-type/my-consumer/alert/getAlertSummary",
            "alerting:alert-type/my-consumer/alert/update",
          ]
        `);
      });

      test('grants both `all` and `read` to rules privileges under feature consumer', () => {
        const actions = new Actions();
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            rule: {
              all: [{ ruleTypeId: 'alert-type', consumers: ['my-consumer'] }],
              read: [{ ruleTypeId: 'readonly-alert-type', consumers: ['my-consumer'] }],
            },
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        };

        const feature = new KibanaFeature({
          id: 'my-feature',
          name: 'my-feature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: privilege,
            read: privilege,
          },
        });

        expect(alertingFeaturePrivileges.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "alerting:alert-type/my-consumer/rule/get",
            "alerting:alert-type/my-consumer/rule/getRuleState",
            "alerting:alert-type/my-consumer/rule/getAlertSummary",
            "alerting:alert-type/my-consumer/rule/getExecutionLog",
            "alerting:alert-type/my-consumer/rule/getActionErrorLog",
            "alerting:alert-type/my-consumer/rule/find",
            "alerting:alert-type/my-consumer/rule/getRuleExecutionKPI",
            "alerting:alert-type/my-consumer/rule/getBackfill",
            "alerting:alert-type/my-consumer/rule/findBackfill",
            "alerting:alert-type/my-consumer/rule/create",
            "alerting:alert-type/my-consumer/rule/delete",
            "alerting:alert-type/my-consumer/rule/update",
            "alerting:alert-type/my-consumer/rule/updateApiKey",
            "alerting:alert-type/my-consumer/rule/enable",
            "alerting:alert-type/my-consumer/rule/disable",
            "alerting:alert-type/my-consumer/rule/muteAll",
            "alerting:alert-type/my-consumer/rule/unmuteAll",
            "alerting:alert-type/my-consumer/rule/muteAlert",
            "alerting:alert-type/my-consumer/rule/unmuteAlert",
            "alerting:alert-type/my-consumer/rule/snooze",
            "alerting:alert-type/my-consumer/rule/bulkEdit",
            "alerting:alert-type/my-consumer/rule/bulkDelete",
            "alerting:alert-type/my-consumer/rule/bulkEnable",
            "alerting:alert-type/my-consumer/rule/bulkDisable",
            "alerting:alert-type/my-consumer/rule/unsnooze",
            "alerting:alert-type/my-consumer/rule/runSoon",
            "alerting:alert-type/my-consumer/rule/scheduleBackfill",
            "alerting:alert-type/my-consumer/rule/deleteBackfill",
            "alerting:readonly-alert-type/my-consumer/rule/get",
            "alerting:readonly-alert-type/my-consumer/rule/getRuleState",
            "alerting:readonly-alert-type/my-consumer/rule/getAlertSummary",
            "alerting:readonly-alert-type/my-consumer/rule/getExecutionLog",
            "alerting:readonly-alert-type/my-consumer/rule/getActionErrorLog",
            "alerting:readonly-alert-type/my-consumer/rule/find",
            "alerting:readonly-alert-type/my-consumer/rule/getRuleExecutionKPI",
            "alerting:readonly-alert-type/my-consumer/rule/getBackfill",
            "alerting:readonly-alert-type/my-consumer/rule/findBackfill",
          ]
        `);
      });

      test('grants both `all` and `read` to alerts privileges under feature consumer', () => {
        const actions = new Actions();
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            alert: {
              all: [{ ruleTypeId: 'alert-type', consumers: ['my-consumer'] }],
              read: [{ ruleTypeId: 'readonly-alert-type', consumers: ['my-consumer'] }],
            },
          },

          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        };

        const feature = new KibanaFeature({
          id: 'my-feature',
          name: 'my-feature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: privilege,
            read: privilege,
          },
        });

        expect(alertingFeaturePrivileges.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "alerting:alert-type/my-consumer/alert/get",
            "alerting:alert-type/my-consumer/alert/find",
            "alerting:alert-type/my-consumer/alert/getAuthorizedAlertsIndices",
            "alerting:alert-type/my-consumer/alert/getAlertSummary",
            "alerting:alert-type/my-consumer/alert/update",
            "alerting:readonly-alert-type/my-consumer/alert/get",
            "alerting:readonly-alert-type/my-consumer/alert/find",
            "alerting:readonly-alert-type/my-consumer/alert/getAuthorizedAlertsIndices",
            "alerting:readonly-alert-type/my-consumer/alert/getAlertSummary",
          ]
        `);
      });

      test('grants both `all` and `read` to rules and alerts privileges under feature consumer', () => {
        const actions = new Actions();
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            rule: {
              all: [{ ruleTypeId: 'alert-type', consumers: ['my-consumer'] }],
              read: [{ ruleTypeId: 'readonly-alert-type', consumers: ['my-consumer'] }],
            },
            alert: {
              all: [{ ruleTypeId: 'another-alert-type', consumers: ['my-consumer'] }],
              read: [{ ruleTypeId: 'readonly-alert-type', consumers: ['my-consumer'] }],
            },
          },

          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        };

        const feature = new KibanaFeature({
          id: 'my-feature',
          name: 'my-feature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: privilege,
            read: privilege,
          },
        });

        expect(alertingFeaturePrivileges.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "alerting:alert-type/my-consumer/rule/get",
            "alerting:alert-type/my-consumer/rule/getRuleState",
            "alerting:alert-type/my-consumer/rule/getAlertSummary",
            "alerting:alert-type/my-consumer/rule/getExecutionLog",
            "alerting:alert-type/my-consumer/rule/getActionErrorLog",
            "alerting:alert-type/my-consumer/rule/find",
            "alerting:alert-type/my-consumer/rule/getRuleExecutionKPI",
            "alerting:alert-type/my-consumer/rule/getBackfill",
            "alerting:alert-type/my-consumer/rule/findBackfill",
            "alerting:alert-type/my-consumer/rule/create",
            "alerting:alert-type/my-consumer/rule/delete",
            "alerting:alert-type/my-consumer/rule/update",
            "alerting:alert-type/my-consumer/rule/updateApiKey",
            "alerting:alert-type/my-consumer/rule/enable",
            "alerting:alert-type/my-consumer/rule/disable",
            "alerting:alert-type/my-consumer/rule/muteAll",
            "alerting:alert-type/my-consumer/rule/unmuteAll",
            "alerting:alert-type/my-consumer/rule/muteAlert",
            "alerting:alert-type/my-consumer/rule/unmuteAlert",
            "alerting:alert-type/my-consumer/rule/snooze",
            "alerting:alert-type/my-consumer/rule/bulkEdit",
            "alerting:alert-type/my-consumer/rule/bulkDelete",
            "alerting:alert-type/my-consumer/rule/bulkEnable",
            "alerting:alert-type/my-consumer/rule/bulkDisable",
            "alerting:alert-type/my-consumer/rule/unsnooze",
            "alerting:alert-type/my-consumer/rule/runSoon",
            "alerting:alert-type/my-consumer/rule/scheduleBackfill",
            "alerting:alert-type/my-consumer/rule/deleteBackfill",
            "alerting:readonly-alert-type/my-consumer/rule/get",
            "alerting:readonly-alert-type/my-consumer/rule/getRuleState",
            "alerting:readonly-alert-type/my-consumer/rule/getAlertSummary",
            "alerting:readonly-alert-type/my-consumer/rule/getExecutionLog",
            "alerting:readonly-alert-type/my-consumer/rule/getActionErrorLog",
            "alerting:readonly-alert-type/my-consumer/rule/find",
            "alerting:readonly-alert-type/my-consumer/rule/getRuleExecutionKPI",
            "alerting:readonly-alert-type/my-consumer/rule/getBackfill",
            "alerting:readonly-alert-type/my-consumer/rule/findBackfill",
            "alerting:another-alert-type/my-consumer/alert/get",
            "alerting:another-alert-type/my-consumer/alert/find",
            "alerting:another-alert-type/my-consumer/alert/getAuthorizedAlertsIndices",
            "alerting:another-alert-type/my-consumer/alert/getAlertSummary",
            "alerting:another-alert-type/my-consumer/alert/update",
            "alerting:readonly-alert-type/my-consumer/alert/get",
            "alerting:readonly-alert-type/my-consumer/alert/find",
            "alerting:readonly-alert-type/my-consumer/alert/getAuthorizedAlertsIndices",
            "alerting:readonly-alert-type/my-consumer/alert/getAlertSummary",
          ]
        `);
      });
    });
  });
});

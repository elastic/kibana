/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertingBuiltinsPlugin } from './plugin';
import { coreMock } from '@kbn/core/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import {
  hasClassicAlertsReadCapability,
  hasClassicRulesReadCapability,
  STACK_ALERTS_SHOW_UI_CAPABILITY,
} from '@kbn/rule-data-utils';
import { BUILT_IN_ALERTS_FEATURE, STACK_ALERTS_ONLY_FEATURE } from './feature';

describe('Stack Alerts Feature Privileges', () => {
  test('feature privilege should contain all built-in rule types', () => {
    const context = coreMock.createPluginInitializerContext();
    const plugin = new AlertingBuiltinsPlugin(context);
    const coreSetup = coreMock.createSetup();
    coreSetup.getStartServices = jest.fn().mockResolvedValue([
      {
        application: {},
      },
      { triggersActionsUi: {} },
    ]);

    const alertingSetup = alertsMock.createSetup();
    const featuresSetup = featuresPluginMock.createSetup();
    plugin.setup(coreSetup, { alerting: alertingSetup, features: featuresSetup });

    const ruleTypeAlerting = BUILT_IN_ALERTS_FEATURE.alerting ?? [];
    const ruleTypeAll = BUILT_IN_ALERTS_FEATURE.privileges?.all?.alerting?.rule?.all ?? [];
    const ruleTypeRead = BUILT_IN_ALERTS_FEATURE.privileges?.read?.alerting?.rule?.read ?? [];

    expect(ruleTypeAlerting).toMatchInlineSnapshot(`
      Array [
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
          ],
          "ruleTypeId": ".index-threshold",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
          ],
          "ruleTypeId": ".geo-containment",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
          ],
          "ruleTypeId": "transform_health",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
            "discover",
          ],
          "ruleTypeId": ".es-query",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
          ],
          "ruleTypeId": "xpack.ml.anomaly_detection_alert",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
          ],
          "ruleTypeId": "observability.rules.custom_threshold",
        },
      ]
    `);

    expect(ruleTypeAll).toMatchInlineSnapshot(`
      Array [
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
          ],
          "ruleTypeId": ".index-threshold",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
          ],
          "ruleTypeId": ".geo-containment",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
          ],
          "ruleTypeId": "transform_health",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
            "discover",
          ],
          "ruleTypeId": ".es-query",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
          ],
          "ruleTypeId": "xpack.ml.anomaly_detection_alert",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
          ],
          "ruleTypeId": "observability.rules.custom_threshold",
        },
      ]
    `);

    expect(ruleTypeRead).toMatchInlineSnapshot(`
      Array [
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
          ],
          "ruleTypeId": ".index-threshold",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
          ],
          "ruleTypeId": ".geo-containment",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
          ],
          "ruleTypeId": "transform_health",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
            "discover",
          ],
          "ruleTypeId": ".es-query",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
          ],
          "ruleTypeId": "xpack.ml.anomaly_detection_alert",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
          ],
          "ruleTypeId": "observability.rules.custom_threshold",
        },
      ]
    `);
  });

  test('both privileges include the API access needed by the rule details page', () => {
    expect(BUILT_IN_ALERTS_FEATURE.privileges?.all.api).toEqual(
      expect.arrayContaining(['rac', 'bulkGetUserProfiles'])
    );
    expect(BUILT_IN_ALERTS_FEATURE.privileges?.read.api).toEqual(
      expect.arrayContaining(['rac', 'bulkGetUserProfiles'])
    );
  });

  test('both privileges grant the show UI capability used to detect classic rules read', () => {
    expect(BUILT_IN_ALERTS_FEATURE.privileges?.all.ui).toContain(STACK_ALERTS_SHOW_UI_CAPABILITY);
    expect(BUILT_IN_ALERTS_FEATURE.privileges?.read.ui).toContain(STACK_ALERTS_SHOW_UI_CAPABILITY);
  });

  test.each(['all', 'read'] as const)(
    'the %s privilege is recognized as classic rule and alert read',
    (level) => {
      const privilege = BUILT_IN_ALERTS_FEATURE.privileges?.[level];
      const ui = Object.fromEntries(
        (privilege?.ui ?? []).map((uiCapability) => [uiCapability, true])
      );
      const capabilities = {
        navLinks: {},
        [BUILT_IN_ALERTS_FEATURE.id]: ui,
      } as Parameters<typeof hasClassicRulesReadCapability>[0];

      expect(privilege?.management?.insightsAndAlerting).toContain('triggersActionsRules');
      expect(privilege?.alerting?.rule?.[level === 'all' ? 'all' : 'read']?.length).toBeGreaterThan(
        0
      );
      expect(hasClassicRulesReadCapability(capabilities)).toBe(true);
      expect(hasClassicAlertsReadCapability(capabilities)).toBe(true);
    }
  );
});

describe('Stack Alerts Only feature and the classic alerts gate', () => {
  test.each(['all', 'read'] as const)(
    'the %s privilege is alert read and not rule read',
    (level) => {
      const privilege = STACK_ALERTS_ONLY_FEATURE.privileges?.[level];
      const ui = Object.fromEntries(
        (privilege?.ui ?? []).map((uiCapability) => [uiCapability, true])
      );
      const capabilities = {
        navLinks: {},
        [STACK_ALERTS_ONLY_FEATURE.id]: ui,
      } as Parameters<typeof hasClassicRulesReadCapability>[0];

      expect(privilege?.management?.insightsAndAlerting).not.toContain('triggersActionsRules');
      expect(hasClassicRulesReadCapability(capabilities)).toBe(false);
      expect(hasClassicAlertsReadCapability(capabilities)).toBe(true);
    }
  );
});

describe('Stack Alerts Only Feature Privileges', () => {
  const allPrivilege = STACK_ALERTS_ONLY_FEATURE.privileges?.all;
  const readPrivilege = STACK_ALERTS_ONLY_FEATURE.privileges?.read;

  test('feature ID is stackAlertsOnly', () => {
    expect(STACK_ALERTS_ONLY_FEATURE.id).toBe('stackAlertsOnly');
  });

  test('"all" privilege grants alert.all for all stack rule types', () => {
    expect(allPrivilege?.alerting?.alert?.all).toMatchInlineSnapshot(`
      Array [
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
          ],
          "ruleTypeId": ".index-threshold",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
          ],
          "ruleTypeId": ".geo-containment",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
          ],
          "ruleTypeId": "transform_health",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
            "discover",
          ],
          "ruleTypeId": ".es-query",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
          ],
          "ruleTypeId": "xpack.ml.anomaly_detection_alert",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
          ],
          "ruleTypeId": "observability.rules.custom_threshold",
        },
      ]
    `);
  });

  test('"all" privilege grants rule.mute_alerts for all stack rule types', () => {
    expect(allPrivilege?.alerting?.rule?.mute_alerts).toMatchInlineSnapshot(`
      Array [
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
          ],
          "ruleTypeId": ".index-threshold",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
          ],
          "ruleTypeId": ".geo-containment",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
          ],
          "ruleTypeId": "transform_health",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
            "discover",
          ],
          "ruleTypeId": ".es-query",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
          ],
          "ruleTypeId": "xpack.ml.anomaly_detection_alert",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
          ],
          "ruleTypeId": "observability.rules.custom_threshold",
        },
      ]
    `);
  });

  test('"all" privilege does NOT grant rule.all, rule.enable, or rule.manage_rule_settings', () => {
    expect(allPrivilege?.alerting?.rule?.all).toBeUndefined();
    expect(allPrivilege?.alerting?.rule?.enable).toBeUndefined();
    expect(allPrivilege?.alerting?.rule?.manage_rule_settings).toBeUndefined();
  });

  test('"read" privilege grants alert.read for all stack rule types', () => {
    expect(readPrivilege?.alerting?.alert?.read).toMatchInlineSnapshot(`
      Array [
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
          ],
          "ruleTypeId": ".index-threshold",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
          ],
          "ruleTypeId": ".geo-containment",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
          ],
          "ruleTypeId": "transform_health",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
            "discover",
          ],
          "ruleTypeId": ".es-query",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
          ],
          "ruleTypeId": "xpack.ml.anomaly_detection_alert",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
          ],
          "ruleTypeId": "observability.rules.custom_threshold",
        },
      ]
    `);
  });

  test('"read" privilege grants rule.read_muted_alerts for all stack rule types', () => {
    expect(readPrivilege?.alerting?.rule?.read_muted_alerts).toMatchInlineSnapshot(`
      Array [
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
          ],
          "ruleTypeId": ".index-threshold",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
          ],
          "ruleTypeId": ".geo-containment",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
          ],
          "ruleTypeId": "transform_health",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
            "alerts",
            "discover",
          ],
          "ruleTypeId": ".es-query",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
          ],
          "ruleTypeId": "xpack.ml.anomaly_detection_alert",
        },
        Object {
          "consumers": Array [
            "stackAlerts",
          ],
          "ruleTypeId": "observability.rules.custom_threshold",
        },
      ]
    `);
  });

  test('"read" privilege does NOT grant rule.all, rule.read, or rule.mute_alerts', () => {
    expect(readPrivilege?.alerting?.rule?.all).toBeUndefined();
    expect(readPrivilege?.alerting?.rule?.read).toBeUndefined();
    expect(readPrivilege?.alerting?.rule?.mute_alerts).toBeUndefined();
  });

  test('both privileges include rac API access', () => {
    expect(allPrivilege?.api).toContain('rac');
    expect(readPrivilege?.api).toContain('rac');
  });

  test('both privileges grant access to the Alerts management link but not Rules', () => {
    expect(allPrivilege?.management?.insightsAndAlerting).toContain('triggersActionsAlerts');
    expect(readPrivilege?.management?.insightsAndAlerting).toContain('triggersActionsAlerts');
    expect(allPrivilege?.management?.insightsAndAlerting).not.toContain('triggersActionsRules');
    expect(readPrivilege?.management?.insightsAndAlerting).not.toContain('triggersActionsRules');
  });

  test('"all" privilege grants the "write" UI capability for alert-modify actions', () => {
    expect(allPrivilege?.ui).toContain('show');
    expect(allPrivilege?.ui).toContain('write');
  });

  test('"read" privilege grants only the "show" UI capability', () => {
    expect(readPrivilege?.ui).toContain('show');
    expect(readPrivilege?.ui).not.toContain('write');
  });
});

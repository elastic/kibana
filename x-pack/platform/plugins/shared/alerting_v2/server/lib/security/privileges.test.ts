/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { ACTION_POLICY_KI_TYPE, RULE_KI_TYPE } from '@kbn/agent-builder-elastic-ai-index-ki-types';

import { registerFeaturePrivileges } from './privileges';
import { ALERTING_V2_FEATURES, getFeatureManagementApps } from '../../../common/feature_privileges';
import {
  ALERTING_V2_ACTION_POLICIES_APP_ID,
  ALERTING_V2_EPISODES_APP_ID,
  ALERTING_V2_EXECUTION_HISTORY_APP_ID,
  ALERTING_V2_RULE_LIBRARY_APP_ID,
  ALERTING_V2_RULES_APP_ID,
  ALERTING_V2_SECTION_ID,
} from '@kbn/alerting-v2-constants';

describe('registerFeaturePrivileges', () => {
  const getRegisteredFeature = (id: string): KibanaFeatureConfig => {
    const features = featuresPluginMock.createSetup();
    registerFeaturePrivileges(features);

    const registered = features.registerKibanaFeature.mock.calls
      .map(([feature]) => feature)
      .find((feature) => feature.id === id);

    if (!registered) {
      throw new Error(`Feature "${id}" was not registered`);
    }

    return registered;
  };

  it('registers a Kibana feature for every alerting_v2 feature', () => {
    const features = featuresPluginMock.createSetup();
    registerFeaturePrivileges(features);

    expect(features.registerKibanaFeature).toHaveBeenCalledTimes(
      Object.keys(ALERTING_V2_FEATURES).length
    );
  });

  it('groups features under the Alerting V2 privilege section', () => {
    const rulesFeature = getRegisteredFeature(ALERTING_V2_FEATURES.rules.id);

    expect(rulesFeature.category).toEqual({
      id: 'alerting',
      label: 'Alerting V2',
      order: 1000,
      euiIconType: 'watchesApp',
    });
  });

  it('describes access for every experimental feature', () => {
    expect(getRegisteredFeature(ALERTING_V2_FEATURES.rules.id).description).toBe(
      'Experimental. Controls access to rules in the experimental alerting system.'
    );
    expect(getRegisteredFeature(ALERTING_V2_FEATURES.alerts.id).description).toBe(
      'Experimental. Controls access to alerts in the experimental alerting system.'
    );
    expect(getRegisteredFeature(ALERTING_V2_FEATURES.actionPolicies.id).description).toBe(
      'Experimental. Controls access to action policies in the experimental alerting system.'
    );
    expect(getRegisteredFeature(ALERTING_V2_FEATURES.executionHistory.id).description).toBe(
      'Experimental. Controls access to execution history in the experimental alerting system.'
    );

    for (const feature of Object.values(ALERTING_V2_FEATURES)) {
      expect(getRegisteredFeature(feature.id).privilegesTooltip).toBeUndefined();
    }
  });

  it('forwards the `alerts` privilege to the `all` and `read` privileges of the alerts feature', () => {
    const alertsFeature = getRegisteredFeature(ALERTING_V2_FEATURES.alerts.id);

    expect(alertsFeature.privileges?.all.alerts).toEqual({ read: true });
    expect(alertsFeature.privileges?.read.alerts).toEqual({ read: true });
  });

  it('does not set the `alerts` privilege for features that do not request it', () => {
    const rulesFeature = getRegisteredFeature(ALERTING_V2_FEATURES.rules.id);

    expect(rulesFeature.privileges?.all.alerts).toBeUndefined();
    expect(rulesFeature.privileges?.read.alerts).toBeUndefined();
  });

  it('grants read access to rule templates on the rules feature (catalog SOs)', () => {
    const rulesFeature = getRegisteredFeature(ALERTING_V2_FEATURES.rules.id);

    expect(rulesFeature.privileges?.all.savedObject).toEqual({
      all: ['alerting_rule'],
      read: ['alerting_rule_template'],
    });
    expect(rulesFeature.privileges?.read.savedObject).toEqual({
      all: [],
      read: ['alerting_rule', 'alerting_rule_template'],
    });
  });

  it('forwards the `aiIndex` privilege to the `all` and `read` privileges of the rules feature', () => {
    const rulesFeature = getRegisteredFeature(ALERTING_V2_FEATURES.rules.id);

    expect(rulesFeature.privileges?.all.aiIndex).toEqual({ read: [RULE_KI_TYPE] });
    expect(rulesFeature.privileges?.read.aiIndex).toEqual({ read: [RULE_KI_TYPE] });
  });

  it('forwards the `aiIndex` privilege to the `all` and `read` privileges of the action policies feature', () => {
    const actionPoliciesFeature = getRegisteredFeature(ALERTING_V2_FEATURES.actionPolicies.id);

    expect(actionPoliciesFeature.privileges?.all.aiIndex).toEqual({
      read: [ACTION_POLICY_KI_TYPE],
    });
    expect(actionPoliciesFeature.privileges?.read.aiIndex).toEqual({
      read: [ACTION_POLICY_KI_TYPE],
    });
  });

  it('does not set the `aiIndex` privilege for features that do not request it', () => {
    const executionHistoryFeature = getRegisteredFeature(ALERTING_V2_FEATURES.executionHistory.id);

    expect(executionHistoryFeature.privileges?.all.aiIndex).toBeUndefined();
    expect(executionHistoryFeature.privileges?.read.aiIndex).toBeUndefined();
  });

  describe('management app gating', () => {
    // Regression: without these declarations Kibana Core treats each
    // alerting_v2 management app as unowned/public within Management, which
    // leaks the "Stack Management" navlink to unrelated read-only roles.
    // See feature_controls/*_security.ts.
    it.each([
      [ALERTING_V2_FEATURES.rules.id, [ALERTING_V2_RULES_APP_ID, ALERTING_V2_RULE_LIBRARY_APP_ID]],
      [ALERTING_V2_FEATURES.alerts.id, [ALERTING_V2_EPISODES_APP_ID]],
      [ALERTING_V2_FEATURES.actionPolicies.id, [ALERTING_V2_ACTION_POLICIES_APP_ID]],
      [ALERTING_V2_FEATURES.executionHistory.id, [ALERTING_V2_EXECUTION_HISTORY_APP_ID]],
    ])('gates the "%s" feature behind the %j management app(s)', (featureId, expectedApps) => {
      const registered = getRegisteredFeature(featureId);
      const expectedManagement = { [ALERTING_V2_SECTION_ID]: expectedApps };

      expect(registered.management).toEqual(expectedManagement);
      expect(registered.privileges?.all.management).toEqual(expectedManagement);
      expect(registered.privileges?.read.management).toEqual(expectedManagement);
    });

    it.each(Object.values(ALERTING_V2_FEATURES).map((f) => [f.id, f.managementApp]))(
      'does not add the "%s" feature\'s management app "%s" to the standalone `app` array',
      (featureId, managementApp) => {
        const registered = getRegisteredFeature(featureId);

        expect(registered.app).not.toContain(managementApp);
        expect(registered.privileges?.all.app).not.toContain(managementApp);
        expect(registered.privileges?.read.app).not.toContain(managementApp);
      }
    );

    it('does not add additional management apps to the standalone `app` array', () => {
      const registered = getRegisteredFeature(ALERTING_V2_FEATURES.rules.id);

      expect(registered.app).not.toContain(ALERTING_V2_RULE_LIBRARY_APP_ID);
      expect(registered.privileges?.all.app).not.toContain(ALERTING_V2_RULE_LIBRARY_APP_ID);
      expect(registered.privileges?.read.app).not.toContain(ALERTING_V2_RULE_LIBRARY_APP_ID);
    });

    it('assigns unique management app ids across features', () => {
      const managementApps = Object.values(ALERTING_V2_FEATURES).flatMap(getFeatureManagementApps);
      expect(new Set(managementApps).size).toBe(managementApps.length);
    });
  });
});

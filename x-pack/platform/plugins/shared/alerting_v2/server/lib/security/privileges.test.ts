/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';

import { registerFeaturePrivileges } from './privileges';
import { ALERTING_V2_FEATURES } from '../../../common/feature_privileges';
import {
  ALERTING_V2_ACTION_POLICIES_APP_ID,
  ALERTING_V2_EPISODES_APP_ID,
  ALERTING_V2_EXECUTION_HISTORY_APP_ID,
  ALERTING_V2_RULES_APP_ID,
  ALERTING_V2_SECTION_ID,
} from '../../../common/management_apps';

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

  describe('management app gating', () => {
    // Regression: without these declarations Kibana Core treats each
    // alerting_v2 management app as unowned/public within Management, which
    // leaks the "Stack Management" navlink to unrelated read-only roles.
    // See feature_controls/*_security.ts.
    it.each([
      [ALERTING_V2_FEATURES.rules.id, ALERTING_V2_RULES_APP_ID],
      [ALERTING_V2_FEATURES.alerts.id, ALERTING_V2_EPISODES_APP_ID],
      [ALERTING_V2_FEATURES.actionPolicies.id, ALERTING_V2_ACTION_POLICIES_APP_ID],
      [ALERTING_V2_FEATURES.executionHistory.id, ALERTING_V2_EXECUTION_HISTORY_APP_ID],
    ])('gates the "%s" feature behind the "%s" management app', (featureId, expectedApp) => {
      const registered = getRegisteredFeature(featureId);
      const expectedManagement = { [ALERTING_V2_SECTION_ID]: [expectedApp] };

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

    it('assigns a unique management app id to each feature (clean split)', () => {
      const managementApps = Object.values(ALERTING_V2_FEATURES).map((f) => f.managementApp);
      expect(new Set(managementApps).size).toBe(managementApps.length);
    });
  });
});

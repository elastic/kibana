/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertingRequiredPrivileges } from './required_privileges';
import { ALERTING_V2_FEATURE_IDS } from '@kbn/alerting-v2-constants';

describe('getAlertingRequiredPrivileges', () => {
  it('maps a feature to its id, name, and privilege level', () => {
    expect(getAlertingRequiredPrivileges(['rules'])).toEqual([
      {
        featureId: ALERTING_V2_FEATURE_IDS.rules,
        featureName: 'Rules',
        privilege: 'read',
      },
    ]);
  });

  it('preserves order and maps every feature in the set', () => {
    const result = getAlertingRequiredPrivileges(['alerts', 'actionPolicies']);
    expect(result.map(({ featureId }) => featureId)).toEqual([
      ALERTING_V2_FEATURE_IDS.alerts,
      ALERTING_V2_FEATURE_IDS.actionPolicies,
    ]);
  });

  it('reflects the requested capability in the privilege level', () => {
    expect(getAlertingRequiredPrivileges(['executionHistory'], 'all')).toEqual([
      {
        featureId: ALERTING_V2_FEATURE_IDS.executionHistory,
        featureName: 'Execution history',
        privilege: 'all',
      },
    ]);
  });

  it('returns an empty list for an empty feature set', () => {
    expect(getAlertingRequiredPrivileges([])).toEqual([]);
  });
});

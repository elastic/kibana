/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertingV2RequiredPrivileges } from './required_privileges';

describe('getAlertingV2RequiredPrivileges', () => {
  it('maps a feature to its id, name, privilege level, and fully-qualified capability', () => {
    expect(getAlertingV2RequiredPrivileges(['rules'])).toEqual([
      {
        featureId: 'alerting_v2_rules',
        featureName: 'Rules',
        privilege: 'read',
        capability: 'alerting_v2_rules.read',
      },
    ]);
  });

  it('preserves order and maps every feature in the set', () => {
    const result = getAlertingV2RequiredPrivileges(['alerts', 'actionPolicies']);
    expect(result.map(({ featureId }) => featureId)).toEqual([
      'alerting_v2_alerts',
      'alerting_v2_action_policies',
    ]);
  });

  it('reflects the requested capability in the privilege level and capability id', () => {
    expect(getAlertingV2RequiredPrivileges(['executionHistory'], 'all')).toEqual([
      {
        featureId: 'alerting_v2_execution_history',
        featureName: 'Execution history',
        privilege: 'all',
        capability: 'alerting_v2_execution_history.all',
      },
    ]);
  });

  it('returns an empty list for an empty feature set', () => {
    expect(getAlertingV2RequiredPrivileges([])).toEqual([]);
  });
});

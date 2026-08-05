/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertingPrivilegeDisplayName } from './feature_privileges';

describe('getAlertingPrivilegeDisplayName', () => {
  it('returns "Rules: All" for rules write', () => {
    expect(getAlertingPrivilegeDisplayName('rules', 'all')).toBe('Rules: All');
  });

  it('returns "Rules: Read" for rules read', () => {
    expect(getAlertingPrivilegeDisplayName('rules', 'read')).toBe('Rules: Read');
  });

  it('returns "Action Policies: All" for actionPolicies write', () => {
    expect(getAlertingPrivilegeDisplayName('actionPolicies', 'all')).toBe('Action Policies: All');
  });

  it('returns "Action Policies: Read" for actionPolicies read', () => {
    expect(getAlertingPrivilegeDisplayName('actionPolicies', 'read')).toBe(
      'Action Policies: Read'
    );
  });

  it('returns "Alerts: All" for alerts write', () => {
    expect(getAlertingPrivilegeDisplayName('alerts', 'all')).toBe('Alerts: All');
  });

  it('returns "Execution history: Read" for executionHistory read', () => {
    expect(getAlertingPrivilegeDisplayName('executionHistory', 'read')).toBe(
      'Execution history: Read'
    );
  });
});

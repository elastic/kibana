/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';
import { applicationServiceMock } from '@kbn/core/public/mocks';
import { getHasAlertingPrivilege, getHasAllAlertingPrivileges } from './use_has_alerting_privilege';

const buildApplication = (capabilities: Record<string, unknown>): ApplicationStart => {
  const application = applicationServiceMock.createStartContract();
  application.capabilities = {
    ...application.capabilities,
    ...capabilities,
  } as ApplicationStart['capabilities'];
  return application;
};

describe('getHasAlertingPrivilege', () => {
  it('returns true when the feature read capability is granted', () => {
    const application = buildApplication({ alerting_v2_rules: { read: true, all: false } });
    expect(getHasAlertingPrivilege(application, 'rules')).toBe(true);
  });

  it('returns false when the feature read capability is denied', () => {
    const application = buildApplication({ alerting_v2_rules: { read: false, all: false } });
    expect(getHasAlertingPrivilege(application, 'rules')).toBe(false);
  });

  it('returns false when the feature capabilities are absent', () => {
    const application = buildApplication({});
    expect(getHasAlertingPrivilege(application, 'alerts')).toBe(false);
  });

  it('checks the requested capability when provided', () => {
    const application = buildApplication({
      alerting_v2_action_policies: { read: true, all: false },
    });
    expect(getHasAlertingPrivilege(application, 'actionPolicies', 'all')).toBe(false);
    expect(getHasAlertingPrivilege(application, 'actionPolicies', 'read')).toBe(true);
  });

  it('maps each feature to its underlying capability namespace', () => {
    const application = buildApplication({
      alerting_v2_execution_history: { read: true, all: true },
    });
    expect(getHasAlertingPrivilege(application, 'executionHistory')).toBe(true);
    expect(getHasAlertingPrivilege(application, 'rules')).toBe(false);
  });
});

describe('getHasAllAlertingPrivileges', () => {
  it('returns true only when every feature in the set is granted', () => {
    const application = buildApplication({
      alerting_v2_alerts: { read: true, all: false },
      alerting_v2_rules: { read: true, all: false },
    });
    expect(getHasAllAlertingPrivileges(application, ['alerts', 'rules'])).toBe(true);
  });

  it('returns false when any feature in the set is missing', () => {
    const application = buildApplication({
      alerting_v2_alerts: { read: true, all: false },
      alerting_v2_rules: { read: false, all: false },
    });
    expect(getHasAllAlertingPrivileges(application, ['alerts', 'rules'])).toBe(false);
  });

  it('returns true for an empty set', () => {
    const application = buildApplication({});
    expect(getHasAllAlertingPrivileges(application, [])).toBe(true);
  });
});

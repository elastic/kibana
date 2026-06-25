/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';
import { applicationServiceMock } from '@kbn/core/public/mocks';
import {
  getHasAlertingV2Privilege,
  getHasAllAlertingV2Privileges,
} from './use_has_alerting_v2_privilege';

const buildApplication = (capabilities: Record<string, unknown>): ApplicationStart => {
  const application = applicationServiceMock.createStartContract();
  application.capabilities = {
    ...application.capabilities,
    ...capabilities,
  } as ApplicationStart['capabilities'];
  return application;
};

describe('getHasAlertingV2Privilege', () => {
  it('returns true when the feature read capability is granted', () => {
    const application = buildApplication({ alerting_v2_rules: { read: true, all: false } });
    expect(getHasAlertingV2Privilege(application, 'rules')).toBe(true);
  });

  it('returns false when the feature read capability is denied', () => {
    const application = buildApplication({ alerting_v2_rules: { read: false, all: false } });
    expect(getHasAlertingV2Privilege(application, 'rules')).toBe(false);
  });

  it('returns false when the feature capabilities are absent', () => {
    const application = buildApplication({});
    expect(getHasAlertingV2Privilege(application, 'alerts')).toBe(false);
  });

  it('checks the requested capability when provided', () => {
    const application = buildApplication({
      alerting_v2_action_policies: { read: true, all: false },
    });
    expect(getHasAlertingV2Privilege(application, 'actionPolicies', 'all')).toBe(false);
    expect(getHasAlertingV2Privilege(application, 'actionPolicies', 'read')).toBe(true);
  });

  it('maps each feature to its underlying capability namespace', () => {
    const application = buildApplication({
      alerting_v2_execution_history: { read: true, all: true },
    });
    expect(getHasAlertingV2Privilege(application, 'executionHistory')).toBe(true);
    expect(getHasAlertingV2Privilege(application, 'rules')).toBe(false);
  });
});

describe('getHasAllAlertingV2Privileges', () => {
  it('returns true only when every feature in the set is granted', () => {
    const application = buildApplication({
      alerting_v2_alerts: { read: true, all: false },
      alerting_v2_rules: { read: true, all: false },
    });
    expect(getHasAllAlertingV2Privileges(application, ['alerts', 'rules'])).toBe(true);
  });

  it('returns false when any feature in the set is missing', () => {
    const application = buildApplication({
      alerting_v2_alerts: { read: true, all: false },
      alerting_v2_rules: { read: false, all: false },
    });
    expect(getHasAllAlertingV2Privileges(application, ['alerts', 'rules'])).toBe(false);
  });

  it('returns true for an empty set', () => {
    const application = buildApplication({});
    expect(getHasAllAlertingV2Privileges(application, [])).toBe(true);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  hasClassicAlertsReadCapability,
  hasClassicRulesReadCapability,
} from '@kbn/rule-data-utils';
import { getPluginPrivileges } from './capabilities';

const ML_FEATURE_ID = 'ml';

/**
 * Nav link capabilities are the feature `app` ids
 * (`disableUICapabilitiesFactory` in the security plugin). `kibana` is not a nav link.
 */
const capabilitiesFromPrivilege = (privilege: {
  app?: readonly string[];
  ui?: readonly string[];
}) => {
  const navLinks = Object.fromEntries(
    (privilege.app ?? []).filter((appId) => appId !== 'kibana').map((appId) => [appId, true])
  );
  const ui = Object.fromEntries((privilege.ui ?? []).map((uiCapability) => [uiCapability, true]));

  return {
    navLinks,
    [ML_FEATURE_ID]: ui,
  } as Parameters<typeof hasClassicRulesReadCapability>[0];
};

describe('ML privileges registered for classic rules visibility', () => {
  const { admin, user, apmUser } = getPluginPrivileges();

  it.each([
    ['all', admin],
    ['read', user],
  ] as const)('recognizes the %s privilege via the ml nav link', (_label, privilege) => {
    const capabilities = capabilitiesFromPrivilege(privilege);

    expect(privilege.management?.insightsAndAlerting).toContain('triggersActionsRules');
    expect(privilege.app).toContain(ML_FEATURE_ID);
    expect(capabilities.navLinks.ml).toBe(true);
    expect(hasClassicRulesReadCapability(capabilities)).toBe(true);
    expect(hasClassicAlertsReadCapability(capabilities)).toBe(true);
  });

  it('does not grant navLinks.ml or classic rules read to the APM sub-privilege', () => {
    const capabilities = capabilitiesFromPrivilege(apmUser);

    expect(apmUser.app).toEqual([]);
    expect(apmUser.ui).toContain('canGetJobs');
    expect(capabilities.navLinks.ml).toBeUndefined();
    expect(hasClassicRulesReadCapability(capabilities)).toBe(false);
    expect(hasClassicAlertsReadCapability(capabilities)).toBe(false);
  });
});

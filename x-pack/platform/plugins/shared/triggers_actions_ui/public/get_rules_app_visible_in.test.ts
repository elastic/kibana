/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import { getRulesAppVisibleIn } from './get_rules_app_visible_in';

const buildCapabilities = (insightsAndAlerting: Record<string, boolean>): Capabilities =>
  ({
    navLinks: {},
    catalogue: {},
    management: { insightsAndAlerting },
  } as unknown as Capabilities);

describe('getRulesAppVisibleIn', () => {
  it('exposes the Rules app in global search and the side nav when the user has rules access', () => {
    const capabilities = buildCapabilities({ triggersActionsRules: true });

    expect(getRulesAppVisibleIn(capabilities)).toEqual(['globalSearch', 'projectSideNav']);
  });

  it('hides the Rules app when the rules management capability is disabled (e.g. stackAlertsOnly)', () => {
    const capabilities = buildCapabilities({
      triggersActionsRules: false,
      triggersActionsAlerts: true,
    });

    expect(getRulesAppVisibleIn(capabilities)).toEqual([]);
  });

  it('hides the Rules app when the rules management capability is absent', () => {
    const capabilities = buildCapabilities({ triggersActionsAlerts: true });

    expect(getRulesAppVisibleIn(capabilities)).toEqual([]);
  });

  it('hides the Rules app when the insightsAndAlerting management section is missing', () => {
    const capabilities = {
      navLinks: {},
      catalogue: {},
      management: {},
    } as unknown as Capabilities;

    expect(getRulesAppVisibleIn(capabilities)).toEqual([]);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import { AppStatus } from '@kbn/core/public';
import { getRulesAppUpdate } from './get_rules_app_update';

const buildCapabilities = (insightsAndAlerting: Record<string, boolean>): Capabilities =>
  ({
    navLinks: {},
    catalogue: {},
    management: { insightsAndAlerting },
  } as unknown as Capabilities);

describe('getRulesAppUpdate', () => {
  it('keeps the Rules app accessible in the side nav when the user has rules access', () => {
    const capabilities = buildCapabilities({ triggersActionsRules: true });

    expect(getRulesAppUpdate(capabilities)).toEqual({
      status: AppStatus.accessible,
      visibleIn: ['projectSideNav'],
    });
  });

  it('hides and disables the Rules app when the rules management capability is disabled (e.g. stackAlertsOnly)', () => {
    const capabilities = buildCapabilities({
      triggersActionsRules: false,
      triggersActionsAlerts: true,
    });

    expect(getRulesAppUpdate(capabilities)).toEqual({
      status: AppStatus.inaccessible,
      visibleIn: [],
    });
  });

  it('hides and disables the Rules app when the rules management capability is absent', () => {
    const capabilities = buildCapabilities({ triggersActionsAlerts: true });

    expect(getRulesAppUpdate(capabilities)).toEqual({
      status: AppStatus.inaccessible,
      visibleIn: [],
    });
  });

  it('hides and disables the Rules app when the insightsAndAlerting management section is missing', () => {
    const capabilities = {
      navLinks: {},
      catalogue: {},
      management: {},
    } as unknown as Capabilities;

    expect(getRulesAppUpdate(capabilities)).toEqual({
      status: AppStatus.inaccessible,
      visibleIn: [],
    });
  });
});

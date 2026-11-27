/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasClassicRulesReadCapability } from '@kbn/rule-data-utils';
import { KIBANA_FEATURE } from './features';

describe('Data Set Quality feature and the classic rules gate', () => {
  it('recognizes the all privilege, which grants triggersActionsRules and rule read', () => {
    const privilege = KIBANA_FEATURE.privileges?.all;
    const navLinks = Object.fromEntries(
      (privilege?.app ?? []).filter((appId) => appId !== 'kibana').map((appId) => [appId, true])
    );
    const ui = Object.fromEntries(
      (privilege?.ui ?? []).map((uiCapability) => [uiCapability, true])
    );

    expect(privilege?.management?.insightsAndAlerting).toContain('triggersActionsRules');
    expect(privilege?.alerting?.rule?.read?.length).toBeGreaterThan(0);
    expect(
      hasClassicRulesReadCapability({
        navLinks,
        [KIBANA_FEATURE.id]: ui,
      } as Parameters<typeof hasClassicRulesReadCapability>[0])
    ).toBe(true);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTING_V2_RULES_LOCATOR,
  ALERTING_V2_RULE_LIBRARY_LOCATOR,
  ALERTING_V2_EPISODES_LOCATOR,
  ALERTING_V2_ACTION_POLICIES_LOCATOR,
  ALERTING_V2_EXECUTION_HISTORY_LOCATOR,
} from '@kbn/alerting-v2-constants';
import {
  type AlertingV2HostApp,
  AlertingV2RulesLocatorDefinition,
  AlertingV2RuleLibraryLocatorDefinition,
  AlertingV2EpisodesLocatorDefinition,
  AlertingV2ActionPoliciesLocatorDefinition,
  AlertingV2ExecutionHistoryLocatorDefinition,
  createAlertingV2HostApp,
} from './locators';

const OBSERVABILITY_HOST: AlertingV2HostApp = createAlertingV2HostApp('observabilityAlerting', {
  rules: '/rules/v2',
  ruleLibrary: '/rule-library',
  episodes: '/inbox',
  actionPolicies: '/action-policies',
  executionHistory: '/execution-history',
});

const SEARCH_HOST: AlertingV2HostApp = createAlertingV2HostApp('search', {
  rules: '/alerting',
  ruleLibrary: '/alerting/library',
  episodes: '/alerting/inbox',
  actionPolicies: '/alerting/action-policies',
  executionHistory: '/alerting/execution-history',
});

describe('AlertingV2RulesLocatorDefinition', () => {
  it('has the correct id', () => {
    expect(AlertingV2RulesLocatorDefinition.id).toBe(ALERTING_V2_RULES_LOCATOR);
  });

  describe('management host', () => {
    const locator = AlertingV2RulesLocatorDefinition;

    it('resolves list', async () => {
      expect(await locator.getLocation({})).toMatchObject({
        app: 'management',
        path: '/alertingV2/rules',
      });
    });

    it('resolves rule details', async () => {
      expect(await locator.getLocation({ ruleId: 'abc-123' })).toMatchObject({
        app: 'management',
        path: '/alertingV2/rules/abc-123',
      });
    });

    it('encodes ruleId', async () => {
      const loc = await locator.getLocation({ ruleId: 'has spaces/slashes' });
      expect(loc.path).toBe('/alertingV2/rules/has%20spaces%2Fslashes');
    });

    it('resolves sequence create', async () => {
      expect(await locator.getLocation({ page: 'sequence_create' })).toMatchObject({
        path: '/alertingV2/rules/sequence/create',
      });
    });

    it('resolves list with templateId', async () => {
      const loc = await locator.getLocation({ templateId: 't-1' });
      expect(loc.path).toBe('/alertingV2/rules?templateId=t-1');
    });
  });

  describe('observability host', () => {
    const locator = AlertingV2RulesLocatorDefinition;

    it('resolves list', async () => {
      expect(await locator.getLocation({ host: OBSERVABILITY_HOST.rules })).toMatchObject({
        app: 'observabilityAlerting',
        path: '/rules/v2',
      });
    });

    it('resolves rule details', async () => {
      expect(
        await locator.getLocation({ ruleId: 'abc-123', host: OBSERVABILITY_HOST.rules })
      ).toMatchObject({
        app: 'observabilityAlerting',
        path: '/rules/v2/abc-123',
      });
    });

    it('resolves sequence create', async () => {
      expect(
        await locator.getLocation({ page: 'sequence_create', host: OBSERVABILITY_HOST.rules })
      ).toMatchObject({
        app: 'observabilityAlerting',
        path: '/rules/v2/sequence/create',
      });
    });
  });
});

describe('AlertingV2RuleLibraryLocatorDefinition', () => {
  it('has the correct id', () => {
    expect(AlertingV2RuleLibraryLocatorDefinition.id).toBe(ALERTING_V2_RULE_LIBRARY_LOCATOR);
  });

  it('resolves list for management', async () => {
    const locator = AlertingV2RuleLibraryLocatorDefinition;
    expect(await locator.getLocation({})).toMatchObject({
      app: 'management',
      path: '/alertingV2/rule_library',
    });
  });

  it('appends templateId', async () => {
    const locator = AlertingV2RuleLibraryLocatorDefinition;
    const loc = await locator.getLocation({ templateId: 'tmpl-1' });
    expect(loc.path).toBe('/alertingV2/rule_library?templateId=tmpl-1');
  });

  it('resolves for observability host', async () => {
    const locator = AlertingV2RuleLibraryLocatorDefinition;
    expect(await locator.getLocation({ host: OBSERVABILITY_HOST.ruleLibrary })).toMatchObject({
      app: 'observabilityAlerting',
      path: '/rule-library',
    });
  });
});

describe('AlertingV2EpisodesLocatorDefinition', () => {
  it('has the correct id', () => {
    expect(AlertingV2EpisodesLocatorDefinition.id).toBe(ALERTING_V2_EPISODES_LOCATOR);
  });

  describe('management host', () => {
    const locator = AlertingV2EpisodesLocatorDefinition;

    it('resolves list', async () => {
      expect(await locator.getLocation({})).toMatchObject({
        app: 'management',
        path: '/alertingV2/episodes',
      });
    });

    it('resolves episode details', async () => {
      expect(await locator.getLocation({ episodeId: 'ep-1' })).toMatchObject({
        path: '/alertingV2/episodes/ep-1',
      });
    });

    it('encodes episodeId', async () => {
      const loc = await locator.getLocation({ episodeId: 'ep/special chars' });
      expect(loc.path).toBe('/alertingV2/episodes/ep%2Fspecial%20chars');
    });

    it('resolves list with filters', async () => {
      const loc = await locator.getLocation({ filters: { ruleId: 'r-1', status: 'active' } });
      expect(loc.path).toContain('/alertingV2/episodes?');
      expect(loc.path).toContain('_a=');
    });

    it('resolves list with timeRange', async () => {
      const loc = await locator.getLocation({
        timeRange: { from: 'now-15m', to: 'now' },
      });
      expect(loc.path).toContain('_a=');
    });

    it('ignores empty filters', async () => {
      const loc = await locator.getLocation({ filters: {} });
      expect(loc.path).toBe('/alertingV2/episodes');
    });

    it('ignores empty groupingValues', async () => {
      const loc = await locator.getLocation({ filters: { groupingValues: {} } });
      expect(loc.path).toBe('/alertingV2/episodes');
    });
  });

  describe('observability host', () => {
    const locator = AlertingV2EpisodesLocatorDefinition;

    it('resolves list', async () => {
      expect(await locator.getLocation({ host: OBSERVABILITY_HOST.episodes })).toMatchObject({
        app: 'observabilityAlerting',
        path: '/inbox',
      });
    });

    it('resolves episode details', async () => {
      expect(
        await locator.getLocation({ episodeId: 'ep-1', host: OBSERVABILITY_HOST.episodes })
      ).toMatchObject({
        app: 'observabilityAlerting',
        path: '/inbox/ep-1',
      });
    });
  });
});

describe('AlertingV2ActionPoliciesLocatorDefinition', () => {
  it('has the correct id', () => {
    expect(AlertingV2ActionPoliciesLocatorDefinition.id).toBe(ALERTING_V2_ACTION_POLICIES_LOCATOR);
  });

  describe('management host', () => {
    const locator = AlertingV2ActionPoliciesLocatorDefinition;

    it('resolves list', async () => {
      expect(await locator.getLocation({})).toMatchObject({
        app: 'management',
        path: '/alertingV2/action_policies',
      });
    });

    it('resolves create', async () => {
      expect(await locator.getLocation({ page: 'create' })).toMatchObject({
        path: '/alertingV2/action_policies/create',
      });
    });

    it('resolves edit', async () => {
      expect(await locator.getLocation({ page: 'edit', actionPolicyId: 'pol-1' })).toMatchObject({
        path: '/alertingV2/action_policies/edit/pol-1',
      });
    });

    it('encodes actionPolicyId', async () => {
      const loc = await locator.getLocation({
        page: 'edit',
        actionPolicyId: 'id/with spaces',
      });
      expect(loc.path).toBe('/alertingV2/action_policies/edit/id%2Fwith%20spaces');
    });

    it('falls back to list when edit has no id', async () => {
      expect(await locator.getLocation({ page: 'edit' })).toMatchObject({
        path: '/alertingV2/action_policies',
      });
    });
  });

  describe('observability host', () => {
    const locator = AlertingV2ActionPoliciesLocatorDefinition;

    it('resolves list', async () => {
      expect(await locator.getLocation({ host: OBSERVABILITY_HOST.actionPolicies })).toMatchObject({
        app: 'observabilityAlerting',
        path: '/action-policies',
      });
    });

    it('resolves create', async () => {
      expect(
        await locator.getLocation({ page: 'create', host: OBSERVABILITY_HOST.actionPolicies })
      ).toMatchObject({
        app: 'observabilityAlerting',
        path: '/action-policies/create',
      });
    });
  });
});

describe('AlertingV2ExecutionHistoryLocatorDefinition', () => {
  it('has the correct id', () => {
    expect(AlertingV2ExecutionHistoryLocatorDefinition.id).toBe(
      ALERTING_V2_EXECUTION_HISTORY_LOCATOR
    );
  });

  it('resolves for management', async () => {
    const locator = AlertingV2ExecutionHistoryLocatorDefinition;
    expect(await locator.getLocation({})).toMatchObject({
      app: 'management',
      path: '/alertingV2/execution_history',
    });
  });

  it('resolves for observability host', async () => {
    const locator = AlertingV2ExecutionHistoryLocatorDefinition;
    expect(await locator.getLocation({ host: OBSERVABILITY_HOST.executionHistory })).toMatchObject({
      app: 'observabilityAlerting',
      path: '/execution-history',
    });
  });
});

describe('createAlertingV2HostApp', () => {
  it('builds a host app config from an appId and page paths', () => {
    const host = createAlertingV2HostApp('myApp', {
      rules: '/r',
      ruleLibrary: '/rl',
      episodes: '/e',
      actionPolicies: '/ap',
      executionHistory: '/eh',
    });

    expect(host.rules).toEqual({ app: 'myApp', basePath: '/r' });
    expect(host.episodes).toEqual({ app: 'myApp', basePath: '/e' });
  });
});

describe('per-call host (classic coexistence)', () => {
  it('same rules locator resolves management, observability, and search without shared state', async () => {
    const locator = AlertingV2RulesLocatorDefinition;

    expect(await locator.getLocation({ ruleId: 'r-1' })).toMatchObject({
      app: 'management',
      path: '/alertingV2/rules/r-1',
    });
    expect(
      await locator.getLocation({ ruleId: 'r-1', host: OBSERVABILITY_HOST.rules })
    ).toMatchObject({
      app: 'observabilityAlerting',
      path: '/rules/v2/r-1',
    });
    expect(await locator.getLocation({ ruleId: 'r-1', host: SEARCH_HOST.rules })).toMatchObject({
      app: 'search',
      path: '/alerting/r-1',
    });
  });
});

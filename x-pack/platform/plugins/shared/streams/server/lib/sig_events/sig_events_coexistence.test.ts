/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/server';
import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import {
  SIGEVENTS_DETECTION_WORKFLOW_ID,
  SIGEVENTS_DISCOVERY_V2_WORKFLOW_ID,
  SIGEVENTS_DISCOVERY_WORKFLOW_ID,
  SIGEVENTS_ORCHESTRATOR_WORKFLOW_ID,
  SIGEVENTS_RULE_ON_RULE_PROVISION_WORKFLOW_ID,
  SIGEVENTS_TRIAGE_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import {
  readSignificantEventsFromAlertsIndices,
  V1_ALERTS_SOURCE,
  V2_ALERTS_SOURCE,
} from './read_significant_events_from_alerts_indices';
import { resolveAlertsSource } from '../../routes/utils/resolve_alerts_source';
import { installWorkflows } from '../workflows/setup/install_workflows';
import {
  isSignificantEventsAlertingV2Active,
  readSignificantEventsAlertingV2UiEnabled,
} from './significant_events_alerting_v2';

jest.mock('./significant_events_alerting_v2', () => ({
  isSignificantEventsAlertingV2Active: jest.fn(),
  readSignificantEventsAlertingV2UiEnabled: jest.fn(),
  logAlertingV2PluginUnavailable: jest.fn(),
}));

describe('SigEvents v1/v2 coexistence scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Scenario A — v1-only read path', () => {
    it('resolveAlertsSource returns v1 when alerting v2 is inactive', async () => {
      (readSignificantEventsAlertingV2UiEnabled as jest.Mock).mockResolvedValue(false);
      jest.mocked(isSignificantEventsAlertingV2Active).mockReturnValue(false);

      const source = await resolveAlertsSource({
        uiSettingsClient: {} as IUiSettingsClient,
        alertingV2RulesClient: {} as RulesClientApi,
      });

      expect(source).toBe(V1_ALERTS_SOURCE);
    });

    it('defaults readSignificantEventsFromAlertsIndices to v1 alerts index semantics', async () => {
      const esqlQuery = jest.fn().mockResolvedValue({
        columns: [
          { name: 'count' },
          { name: 'rule_uuid' },
          { name: 'bucket' },
        ],
        values: [],
      });

      const scopedClusterClient = {
        asCurrentUser: { esql: { query: esqlQuery } },
      };

      const queryClient = {
        getQueryLinks: jest.fn().mockResolvedValue([
          {
            'asset.uuid': 'uuid-q1',
            'asset.type': 'query',
            'asset.id': 'q1',
            query: {
              id: 'q1',
              type: 'match',
              title: 'Test',
              description: 'desc',
              esql: { query: 'FROM logs' },
              severity_score: 60,
            },
            stream_name: 'logs.test',
            rule_backed: true,
            rule_id: 'rule-q1',
          },
        ]),
      };

      await readSignificantEventsFromAlertsIndices(
        {
          from: new Date('2026-01-01T00:00:00.000Z'),
          to: new Date('2026-01-01T00:05:00.000Z'),
          bucketSize: '1m',
        },
        { queryClient: queryClient as never, scopedClusterClient: scopedClusterClient as never }
      );

      const requestArg = esqlQuery.mock.calls[0]?.[0];
      expect(JSON.stringify(requestArg)).toContain('.alerts-streams.alerts-default');
      expect(JSON.stringify(requestArg)).toContain('rule_uuid');
    });
  });

  describe('Scenario B — greenfield v2 read path', () => {
    it('resolveAlertsSource returns v2 when alerting v2 is active', async () => {
      (readSignificantEventsAlertingV2UiEnabled as jest.Mock).mockResolvedValue(true);
      jest.mocked(isSignificantEventsAlertingV2Active).mockReturnValue(true);

      const source = await resolveAlertsSource({
        uiSettingsClient: {} as IUiSettingsClient,
        alertingV2RulesClient: {} as RulesClientApi,
      });

      expect(source).toBe(V2_ALERTS_SOURCE);
    });

    it('reads .rule-events when alertsSource is v2', async () => {
      const esqlQuery = jest.fn().mockResolvedValue({
        columns: [
          { name: 'count' },
          { name: 'rule_id' },
          { name: 'bucket' },
        ],
        values: [],
      });

      const scopedClusterClient = {
        asCurrentUser: { esql: { query: esqlQuery } },
      };

      const queryClient = {
        getQueryLinks: jest.fn().mockResolvedValue([
          {
            'asset.uuid': 'uuid-q1',
            'asset.type': 'query',
            'asset.id': 'q1',
            query: {
              id: 'q1',
              type: 'match',
              title: 'Test',
              description: 'desc',
              esql: { query: 'FROM logs' },
              severity_score: 60,
            },
            stream_name: 'logs.test',
            rule_backed: true,
            rule_id: 'rule-q1',
          },
        ]),
      };

      await readSignificantEventsFromAlertsIndices(
        {
          from: new Date('2026-01-01T00:00:00.000Z'),
          to: new Date('2026-01-01T00:05:00.000Z'),
          bucketSize: '1m',
          alertsSource: V2_ALERTS_SOURCE,
        },
        { queryClient: queryClient as never, scopedClusterClient: scopedClusterClient as never }
      );

      const requestArg = esqlQuery.mock.calls[0]?.[0];
      expect(JSON.stringify(requestArg)).toContain('.rule-events');
      expect(JSON.stringify(requestArg)).toContain('COUNT_DISTINCT');
    });
  });

  describe('Scenario C — upgrade migration prerequisites', () => {
    it('migration is skipped when v2 flag is off (pre-upgrade)', async () => {
      (readSignificantEventsAlertingV2UiEnabled as jest.Mock).mockResolvedValue(false);
      jest.mocked(isSignificantEventsAlertingV2Active).mockReturnValue(false);

      const source = await resolveAlertsSource({
        uiSettingsClient: {} as IUiSettingsClient,
      });

      expect(source).toBe(V1_ALERTS_SOURCE);
    });
  });

  describe('Scenario D — attempted downgrade read path', () => {
    it('falls back to v1 alerts source when v2 is disabled after prior migration', async () => {
      (readSignificantEventsAlertingV2UiEnabled as jest.Mock).mockResolvedValue(false);
      jest.mocked(isSignificantEventsAlertingV2Active).mockReturnValue(false);

      const source = await resolveAlertsSource({
        uiSettingsClient: {} as IUiSettingsClient,
        alertingV2RulesClient: {} as RulesClientApi,
      });

      expect(source).toBe(V1_ALERTS_SOURCE);
    });
  });

  describe('Pipeline coexistence — both workflow families installed', () => {
    it('installs v1 orchestrator chain and v2 event-driven workflows together', async () => {
      const install = jest.fn().mockResolvedValue(undefined);
      const client = { install } as unknown as PluginScopedManagedWorkflowsApi;

      await installWorkflows({ client, isSignificantEventsMemoryEnabled: false });

      const installedIds = install.mock.calls.map(([workflowId]) => workflowId);
      expect(installedIds).toEqual(
        expect.arrayContaining([
          SIGEVENTS_DETECTION_WORKFLOW_ID,
          SIGEVENTS_DISCOVERY_WORKFLOW_ID,
          SIGEVENTS_TRIAGE_WORKFLOW_ID,
          SIGEVENTS_ORCHESTRATOR_WORKFLOW_ID,
          SIGEVENTS_DISCOVERY_V2_WORKFLOW_ID,
          SIGEVENTS_RULE_ON_RULE_PROVISION_WORKFLOW_ID,
        ])
      );
    });
  });
});

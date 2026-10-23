/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

jest.mock('react-use/lib/useSessionStorage', () => jest.fn());
jest.mock('../../onboarding_flow_context', () => ({ useOnboardingFlow: jest.fn() }));
jest.mock('@kbn/kibana-react-plugin/public', () => ({ useKibana: jest.fn() }));
jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('./use_agent_detection', () => ({ useAgentDetection: jest.fn() }));

import useSessionStorage from 'react-use/lib/useSessionStorage';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@kbn/react-query';
import { useOnboardingFlow } from '../../onboarding_flow_context';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { ServiceSettingsPersistedState } from '../service_settings_step/use_service_settings';
import { useAgentDetection } from './use_agent_detection';
import { useServiceDataDetection } from './use_service_data_detection';

const mockUseSessionStorage = useSessionStorage as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;
const mockUseQuery = useQuery as jest.Mock;
const mockUseOnboardingFlow = useOnboardingFlow as jest.Mock;
const mockUseAgentDetection = useAgentDetection as jest.Mock;

function makeEntry(id: string, dataset: string): AwsServiceMatrixEntry {
  return {
    id,
    name: id,
    packageName: 'aws',
    dataStreams: [id],
    signalTypes: ['logs'],
    deploymentMethods: [],
    defaultEnabled: true,
    defaultEnabledInputs: [],
    showInUI: true,
    varDefsByDataStream: {
      [id]: { type: 'logs', dataset, inputs: [], defaultEnabledInputs: [], varDefsByInput: {} },
    },
  } as unknown as AwsServiceMatrixEntry;
}

const CLOUDTRAIL = makeEntry('cloudtrail', 'aws.cloudtrail');

const NO_AGENTS = {
  summaryByInstanceId: {},
  hasDataByInstanceId: {},
  dataSourceByInstanceId: {},
  packagePolicyByInstanceId: {},
  agentPolicyByInstanceId: {},
};

function setup({
  serviceSettings,
  serviceStatuses = {},
  deployErrors = {},
  policyIdsByInstance = {},
  agentDetection = NO_AGENTS,
  queryData,
}: {
  serviceSettings: ServiceSettingsPersistedState;
  serviceStatuses?: Record<string, string>;
  deployErrors?: Record<string, string>;
  policyIdsByInstance?: Record<string, string>;
  agentDetection?: Record<string, unknown>;
  queryData?: { results: Record<string, boolean> };
}) {
  const httpGet = jest.fn().mockResolvedValue({ results: {} });
  mockUseKibana.mockReturnValue({ services: { http: { get: httpGet } } });
  mockUseSessionStorage.mockReturnValue([serviceSettings, jest.fn()]);
  mockUseQuery.mockReturnValue({ data: queryData });
  mockUseAgentDetection.mockReturnValue(agentDetection);
  const updateDetectAndReviewStep = jest.fn();
  mockUseOnboardingFlow.mockReturnValue({
    servicesStep: { selectedServiceIds: ['cloudtrail'] },
    detectAndReviewStep: { serviceStatuses, deployErrors, policyIdsByInstance },
    awsServicesMap: new Map([['cloudtrail', CLOUDTRAIL]]),
    updateDetectAndReviewStep,
  });
  return { httpGet, updateDetectAndReviewStep };
}

describe('useServiceDataDetection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('polls the concrete namespace pattern for an instance with a namespace', async () => {
    const { httpGet } = setup({
      serviceSettings: {
        globalRegion: 'us-east-1',
        instances: [
          { instanceId: 'cloudtrail', serviceId: 'cloudtrail', name: 'CT', isDuplicate: false },
        ],
        serviceVars: {
          cloudtrail: {
            enabledDataStreams: ['cloudtrail'],
            varsByDataStream: {},
            namespace: 'prod',
          },
        },
      },
    });
    renderHook(() => useServiceDataDetection());

    await mockUseQuery.mock.calls[0][0].queryFn();

    expect(httpGet).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        query: expect.objectContaining({ dataStreams: 'logs-aws.cloudtrail-prod' }),
      })
    );
  });

  it('polls one pattern per instance namespace when a duplicate uses another one', async () => {
    const { httpGet } = setup({
      serviceSettings: {
        globalRegion: 'us-east-1',
        instances: [
          { instanceId: 'cloudtrail', serviceId: 'cloudtrail', name: 'CT', isDuplicate: false },
          {
            instanceId: 'cloudtrail__dup-1',
            serviceId: 'cloudtrail',
            name: 'CT 2',
            isDuplicate: true,
          },
        ],
        serviceVars: {
          cloudtrail: {
            enabledDataStreams: ['cloudtrail'],
            varsByDataStream: {},
            namespace: 'prod',
          },
          'cloudtrail__dup-1': {
            enabledDataStreams: ['cloudtrail'],
            varsByDataStream: {},
            namespace: 'staging',
          },
        },
      },
    });
    renderHook(() => useServiceDataDetection());

    await mockUseQuery.mock.calls[0][0].queryFn();

    expect(httpGet.mock.calls[0][1].query.dataStreams).toBe(
      'logs-aws.cloudtrail-prod,logs-aws.cloudtrail-staging'
    );
  });

  it('splits patterns into requests that fit the dataStreams length cap and merges results', async () => {
    const instances = Array.from({ length: 35 }, (_, i) => ({
      instanceId: i === 0 ? 'cloudtrail' : `cloudtrail__dup-${i}`,
      serviceId: 'cloudtrail',
      name: `CT ${i}`,
      isDuplicate: i > 0,
    }));
    const serviceVars = Object.fromEntries(
      instances.map(({ instanceId }, i) => [
        instanceId,
        {
          enabledDataStreams: ['cloudtrail'],
          varsByDataStream: {},
          namespace: `${String(i).padStart(2, '0')}${'n'.repeat(98)}`,
        },
      ])
    );
    const { httpGet } = setup({
      serviceSettings: { globalRegion: 'us-east-1', instances, serviceVars },
    });
    httpGet.mockImplementation(
      async (_path: string, { query }: { query: { dataStreams: string } }) => ({
        results: Object.fromEntries(query.dataStreams.split(',').map((p) => [p, true])),
      })
    );
    renderHook(() => useServiceDataDetection());

    const merged = await mockUseQuery.mock.calls[0][0].queryFn();

    expect(httpGet.mock.calls.length).toBeGreaterThan(1);
    for (const [, { query }] of httpGet.mock.calls) {
      expect(query.dataStreams.length).toBeLessThanOrEqual(4096);
    }
    expect(Object.keys(merged.results)).toHaveLength(35);
  });

  it('polls duplicate namespaces on resume, where only serviceVars are restored', async () => {
    const { httpGet } = setup({
      serviceSettings: {
        globalRegion: 'us-east-1',
        serviceVars: {
          cloudtrail: {
            enabledDataStreams: ['cloudtrail'],
            varsByDataStream: {},
            namespace: 'prod',
          },
          'cloudtrail__dup-1': {
            enabledDataStreams: ['cloudtrail'],
            varsByDataStream: {},
            namespace: 'staging',
          },
        },
      },
    });
    renderHook(() => useServiceDataDetection());

    await mockUseQuery.mock.calls[0][0].queryFn();

    expect(httpGet.mock.calls[0][1].query.dataStreams).toBe(
      'logs-aws.cloudtrail-prod,logs-aws.cloudtrail-staging'
    );
  });

  it('keeps polling the original on resume when only its duplicate has saved serviceVars', async () => {
    const { httpGet } = setup({
      serviceSettings: {
        globalRegion: 'us-east-1',
        serviceVars: {
          'cloudtrail__dup-1': {
            enabledDataStreams: ['cloudtrail'],
            varsByDataStream: {},
            namespace: 'staging',
          },
        },
      },
    });
    renderHook(() => useServiceDataDetection());

    await mockUseQuery.mock.calls[0][0].queryFn();

    expect(httpGet.mock.calls[0][1].query.dataStreams).toBe(
      'logs-aws.cloudtrail-*,logs-aws.cloudtrail-staging'
    );
  });

  it('keeps the wildcard pattern when no namespace is set', async () => {
    const { httpGet } = setup({
      serviceSettings: { globalRegion: 'us-east-1', serviceVars: {} },
    });
    renderHook(() => useServiceDataDetection());

    await mockUseQuery.mock.calls[0][0].queryFn();

    expect(httpGet.mock.calls[0][1].query.dataStreams).toBe('logs-aws.cloudtrail-*');
  });

  describe('duplicates in different namespaces', () => {
    const TWO_NAMESPACES: ServiceSettingsPersistedState = {
      globalRegion: 'us-east-1',
      instances: [
        { instanceId: 'cloudtrail', serviceId: 'cloudtrail', name: 'CT', isDuplicate: false },
        {
          instanceId: 'cloudtrail__dup-1',
          serviceId: 'cloudtrail',
          name: 'CT 2',
          isDuplicate: true,
        },
      ],
      serviceVars: {
        cloudtrail: { enabledDataStreams: ['cloudtrail'], varsByDataStream: {}, namespace: 'prod' },
        'cloudtrail__dup-1': {
          enabledDataStreams: ['cloudtrail'],
          varsByDataStream: {},
          namespace: 'staging',
        },
      },
    };
    const DETECTING = { cloudtrail: 'detecting', 'cloudtrail__dup-1': 'detecting' };

    it('matches each instance against its own namespace, so one duplicate cannot mark the other', () => {
      setup({
        serviceSettings: TWO_NAMESPACES,
        serviceStatuses: DETECTING,
        queryData: {
          results: { 'logs-aws.cloudtrail-prod': false, 'logs-aws.cloudtrail-staging': true },
        },
      });
      const { result } = renderHook(() => useServiceDataDetection());

      // The staging duplicate has data, the prod original does not, so the tile is not receiving.
      expect(result.current.statusByInstanceId.cloudtrail).toBe('detecting');
    });

    it('keeps polling for the instance that is still quiet', () => {
      setup({
        serviceSettings: TWO_NAMESPACES,
        serviceStatuses: DETECTING,
        queryData: {
          results: { 'logs-aws.cloudtrail-prod': false, 'logs-aws.cloudtrail-staging': true },
        },
      });
      renderHook(() => useServiceDataDetection());

      const { calls } = mockUseAgentDetection.mock;
      expect(calls[calls.length - 1][0].shouldPoll).toBe(true);
    });

    it('persists receiving only for the instance whose namespace has data', () => {
      const { updateDetectAndReviewStep } = setup({
        serviceSettings: TWO_NAMESPACES,
        serviceStatuses: DETECTING,
        queryData: {
          results: { 'logs-aws.cloudtrail-prod': false, 'logs-aws.cloudtrail-staging': true },
        },
      });
      renderHook(() => useServiceDataDetection());

      expect(updateDetectAndReviewStep).toHaveBeenCalledWith({
        serviceStatuses: { 'cloudtrail__dup-1': 'receiving' },
      });
    });

    it('is receiving once every instance has data in its own namespace', () => {
      setup({
        serviceSettings: TWO_NAMESPACES,
        serviceStatuses: DETECTING,
        queryData: {
          results: { 'logs-aws.cloudtrail-prod': true, 'logs-aws.cloudtrail-staging': true },
        },
      });
      const { result } = renderHook(() => useServiceDataDetection());

      expect(result.current.statusByInstanceId.cloudtrail).toBe('receiving');
    });

    it('still asks for both namespaces in a single request', async () => {
      const { httpGet } = setup({ serviceSettings: TWO_NAMESPACES });
      renderHook(() => useServiceDataDetection());

      await mockUseQuery.mock.calls[0][0].queryFn();

      expect(httpGet).toHaveBeenCalledTimes(1);
      expect(httpGet.mock.calls[0][1].query.dataStreams).toBe(
        'logs-aws.cloudtrail-prod,logs-aws.cloudtrail-staging'
      );
    });

    it('applies per instance for pattern-sourced Fleet instances too', () => {
      const instance = (id: string) => ({
        health: 'healthy',
        agent: { id },
        agentIds: [id],
        liveAgentIds: [id],
      });
      setup({
        serviceSettings: TWO_NAMESPACES,
        serviceStatuses: DETECTING,
        policyIdsByInstance: { cloudtrail: 'policy-1', 'cloudtrail__dup-1': 'policy-2' },
        agentDetection: {
          ...NO_AGENTS,
          summaryByInstanceId: { cloudtrail: instance('a1'), 'cloudtrail__dup-1': instance('a2') },
          dataSourceByInstanceId: { cloudtrail: 'patterns', 'cloudtrail__dup-1': 'patterns' },
        },
        queryData: {
          results: { 'logs-aws.cloudtrail-prod': false, 'logs-aws.cloudtrail-staging': true },
        },
      });
      const { result } = renderHook(() => useServiceDataDetection());

      expect(result.current.statusByInstanceId.cloudtrail).toBe('detecting');
    });
  });

  describe('instances deployed through Fleet', () => {
    const SETTINGS_WITH_DUPLICATE: ServiceSettingsPersistedState = {
      globalRegion: 'us-east-1',
      instances: [
        { instanceId: 'cloudtrail', serviceId: 'cloudtrail', name: 'CT', isDuplicate: false },
        {
          instanceId: 'cloudtrail__dup-1',
          serviceId: 'cloudtrail',
          name: 'CT 2',
          isDuplicate: true,
        },
      ],
      serviceVars: {},
    };
    const SINGLE: ServiceSettingsPersistedState = { globalRegion: 'us-east-1', serviceVars: {} };

    const agentDetection = ({
      health = 'healthy',
      hasData = false,
      instanceId = 'cloudtrail',
    }: {
      health?: string;
      hasData?: boolean;
      instanceId?: string;
    } = {}) => ({
      ...NO_AGENTS,
      summaryByInstanceId: {
        [instanceId]: { health, agent: { id: 'a1' }, agentIds: ['a1'], liveAgentIds: ['a1'] },
      },
      hasDataByInstanceId: { [instanceId]: hasData },
    });

    it('does not poll index patterns for an instance that has an agent', () => {
      setup({
        serviceSettings: SINGLE,
        policyIdsByInstance: { cloudtrail: 'policy-1' },
        agentDetection: agentDetection(),
      });
      renderHook(() => useServiceDataDetection());

      expect(mockUseQuery.mock.calls[0][0].enabled).toBe(false);
    });

    it('marks the service receiving from the agent data signal, not index patterns', () => {
      setup({
        serviceSettings: SINGLE,
        serviceStatuses: { cloudtrail: 'detecting' },
        policyIdsByInstance: { cloudtrail: 'policy-1' },
        agentDetection: agentDetection({ hasData: true }),
        queryData: { results: { 'logs-aws.cloudtrail-*': false } },
      });
      const { result } = renderHook(() => useServiceDataDetection());

      expect(result.current.statusByInstanceId.cloudtrail).toBe('receiving');
    });

    it('ignores a stale index-pattern hit when the agent reports no data', () => {
      setup({
        serviceSettings: SINGLE,
        serviceStatuses: { cloudtrail: 'detecting' },
        policyIdsByInstance: { cloudtrail: 'policy-1' },
        agentDetection: agentDetection({ hasData: false }),
        queryData: { results: { 'logs-aws.cloudtrail-*': true } },
      });
      const { result } = renderHook(() => useServiceDataDetection());

      expect(result.current.statusByInstanceId.cloudtrail).toBe('detecting');
    });

    it('shows an error for an unhealthy agent', () => {
      setup({
        serviceSettings: SINGLE,
        serviceStatuses: { cloudtrail: 'detecting' },
        policyIdsByInstance: { cloudtrail: 'policy-1' },
        agentDetection: agentDetection({ health: 'unhealthy' }),
      });
      const { result } = renderHook(() => useServiceDataDetection());

      expect(result.current.statusByInstanceId.cloudtrail).toBe('error');
    });

    it('keeps detecting while the agent is pending', () => {
      setup({
        serviceSettings: SINGLE,
        serviceStatuses: { cloudtrail: 'detecting' },
        policyIdsByInstance: { cloudtrail: 'policy-1' },
        agentDetection: agentDetection({ health: 'pending' }),
      });
      const { result } = renderHook(() => useServiceDataDetection());

      expect(result.current.statusByInstanceId.cloudtrail).toBe('detecting');
    });

    it('exposes the agent behind the service for the tile', () => {
      setup({
        serviceSettings: SINGLE,
        policyIdsByInstance: { cloudtrail: 'policy-1' },
        agentDetection: agentDetection({ health: 'unhealthy' }),
      });
      const { result } = renderHook(() => useServiceDataDetection());

      expect(result.current.agentInfoByServiceId.cloudtrail).toMatchObject({
        health: 'unhealthy',
        policyId: 'policy-1',
        agent: { id: 'a1' },
      });
    });

    it('exposes no agent for an ECF service', () => {
      setup({ serviceSettings: SINGLE });
      const { result } = renderHook(() => useServiceDataDetection());

      expect(result.current.agentInfoByServiceId).toEqual({});
    });

    it('persists receiving per instance, so a duplicate is not re-detected on remount', () => {
      const { updateDetectAndReviewStep } = setup({
        serviceSettings: SETTINGS_WITH_DUPLICATE,
        serviceStatuses: { cloudtrail: 'detecting', 'cloudtrail__dup-1': 'detecting' },
        policyIdsByInstance: { cloudtrail: 'policy-1', 'cloudtrail__dup-1': 'policy-2' },
        agentDetection: {
          ...NO_AGENTS,
          summaryByInstanceId: {
            cloudtrail: {
              health: 'healthy',
              agent: { id: 'a1' },
              agentIds: ['a1'],
              liveAgentIds: ['a1'],
            },
            'cloudtrail__dup-1': {
              health: 'healthy',
              agent: { id: 'a2' },
              agentIds: ['a2'],
              liveAgentIds: ['a2'],
            },
          },
          hasDataByInstanceId: { cloudtrail: true, 'cloudtrail__dup-1': true },
        },
      });
      renderHook(() => useServiceDataDetection());

      expect(updateDetectAndReviewStep).toHaveBeenCalledWith({
        serviceStatuses: { cloudtrail: 'receiving', 'cloudtrail__dup-1': 'receiving' },
      });
    });

    it('only reports a duplicated service receiving once every instance does', () => {
      setup({
        serviceSettings: SETTINGS_WITH_DUPLICATE,
        policyIdsByInstance: { cloudtrail: 'policy-1', 'cloudtrail__dup-1': 'policy-2' },
        serviceStatuses: { cloudtrail: 'detecting', 'cloudtrail__dup-1': 'detecting' },
        agentDetection: {
          ...NO_AGENTS,
          summaryByInstanceId: {
            cloudtrail: {
              health: 'healthy',
              agent: { id: 'a1' },
              agentIds: ['a1'],
              liveAgentIds: ['a1'],
            },
            'cloudtrail__dup-1': {
              health: 'healthy',
              agent: { id: 'a2' },
              agentIds: ['a2'],
              liveAgentIds: ['a2'],
            },
          },
          hasDataByInstanceId: { cloudtrail: true, 'cloudtrail__dup-1': false },
        },
      });
      const { result } = renderHook(() => useServiceDataDetection());

      expect(result.current.statusByInstanceId.cloudtrail).toBe('detecting');
    });

    it('fails a duplicated service when any instance fails, and shows the worst agent', () => {
      setup({
        serviceSettings: SETTINGS_WITH_DUPLICATE,
        policyIdsByInstance: { cloudtrail: 'policy-1', 'cloudtrail__dup-1': 'policy-2' },
        serviceStatuses: { cloudtrail: 'receiving', 'cloudtrail__dup-1': 'detecting' },
        agentDetection: {
          ...NO_AGENTS,
          summaryByInstanceId: {
            cloudtrail: {
              health: 'healthy',
              agent: { id: 'a1' },
              agentIds: ['a1'],
              liveAgentIds: ['a1'],
            },
            'cloudtrail__dup-1': {
              health: 'unhealthy',
              agent: { id: 'a2' },
              agentIds: ['a2'],
              liveAgentIds: ['a2'],
            },
          },
          hasDataByInstanceId: { cloudtrail: true, 'cloudtrail__dup-1': false },
        },
      });
      const { result } = renderHook(() => useServiceDataDetection());

      expect(result.current.statusByInstanceId.cloudtrail).toBe('error');
      expect(result.current.agentInfoByServiceId.cloudtrail).toMatchObject({
        health: 'unhealthy',
        policyId: 'policy-2',
      });
    });

    it('still polls patterns for a duplicate that has no agent', () => {
      setup({
        serviceSettings: SETTINGS_WITH_DUPLICATE,
        policyIdsByInstance: { cloudtrail: 'policy-1' },
        agentDetection: agentDetection(),
      });
      renderHook(() => useServiceDataDetection());

      expect(mockUseQuery.mock.calls[0][0].enabled).toBe(true);
    });
  });

  describe('polling follows the current effective state', () => {
    const SINGLE: ServiceSettingsPersistedState = { globalRegion: 'us-east-1', serviceVars: {} };
    const POLICIES = { cloudtrail: 'policy-1' };
    const withAgent = (health: string, hasData = true) => ({
      ...NO_AGENTS,
      summaryByInstanceId: {
        cloudtrail: { health, agent: { id: 'a1' }, agentIds: ['a1'], liveAgentIds: ['a1'] },
      },
      hasDataByInstanceId: { cloudtrail: hasData },
      dataSourceByInstanceId: { cloudtrail: 'agent' },
    });
    const lastShouldPoll = () => {
      const { calls } = mockUseAgentDetection.mock;
      return calls[calls.length - 1][0].shouldPoll;
    };

    it('polls at first, while nothing is known to be receiving', () => {
      setup({ serviceSettings: SINGLE, policyIdsByInstance: POLICIES });
      renderHook(() => useServiceDataDetection());

      expect(mockUseAgentDetection.mock.calls[0][0].shouldPoll).toBe(true);
    });

    it('stops once every instance is effectively receiving', () => {
      setup({
        serviceSettings: SINGLE,
        serviceStatuses: { cloudtrail: 'receiving' },
        policyIdsByInstance: POLICIES,
        agentDetection: withAgent('healthy'),
      });
      renderHook(() => useServiceDataDetection());

      expect(lastShouldPoll()).toBe(false);
    });

    it('keeps polling when a saved "receiving" is overridden by an unhealthy agent', () => {
      // Re-entering Step 4 after an agent went offline: the saved status says receiving, but the
      // agent now says otherwise, and polling has to stay on to see it come back.
      setup({
        serviceSettings: SINGLE,
        serviceStatuses: { cloudtrail: 'receiving' },
        policyIdsByInstance: POLICIES,
        agentDetection: withAgent('unhealthy'),
      });
      const { result } = renderHook(() => useServiceDataDetection());

      expect(result.current.statusByInstanceId.cloudtrail).toBe('error');
      expect(lastShouldPoll()).toBe(true);
    });

    it('resumes polling when an agent goes unhealthy after the tile settled', () => {
      setup({
        serviceSettings: SINGLE,
        serviceStatuses: { cloudtrail: 'receiving' },
        policyIdsByInstance: POLICIES,
        agentDetection: withAgent('healthy'),
      });
      const { rerender } = renderHook(() => useServiceDataDetection());
      expect(lastShouldPoll()).toBe(false);

      mockUseAgentDetection.mockReturnValue(withAgent('unhealthy'));
      rerender();

      expect(lastShouldPoll()).toBe(true);
    });

    it('stops again when the agent comes back, so the tile recovers without a remount', () => {
      setup({
        serviceSettings: SINGLE,
        serviceStatuses: { cloudtrail: 'receiving' },
        policyIdsByInstance: POLICIES,
        agentDetection: withAgent('unhealthy'),
      });
      const { result, rerender } = renderHook(() => useServiceDataDetection());
      expect(lastShouldPoll()).toBe(true);

      mockUseAgentDetection.mockReturnValue(withAgent('healthy'));
      rerender();

      expect(result.current.statusByInstanceId.cloudtrail).toBe('receiving');
      expect(lastShouldPoll()).toBe(false);
    });

    it('does not stop while any instance is still detecting', () => {
      setup({
        serviceSettings: {
          globalRegion: 'us-east-1',
          instances: [
            { instanceId: 'cloudtrail', serviceId: 'cloudtrail', name: 'CT', isDuplicate: false },
            {
              instanceId: 'cloudtrail__dup-1',
              serviceId: 'cloudtrail',
              name: 'CT 2',
              isDuplicate: true,
            },
          ],
          serviceVars: {},
        },
        serviceStatuses: { cloudtrail: 'receiving', 'cloudtrail__dup-1': 'detecting' },
      });
      renderHook(() => useServiceDataDetection());

      expect(lastShouldPoll()).toBe(true);
    });

    it('settles an ECF service once its index patterns have data', () => {
      setup({
        serviceSettings: SINGLE,
        serviceStatuses: { cloudtrail: 'detecting' },
        queryData: { results: { 'logs-aws.cloudtrail-*': true } },
      });
      renderHook(() => useServiceDataDetection());

      expect(lastShouldPoll()).toBe(false);
    });
  });

  describe('instances whose data is detected through index patterns', () => {
    const SINGLE: ServiceSettingsPersistedState = { globalRegion: 'us-east-1', serviceVars: {} };
    const patternsInstance = ({
      health = 'healthy',
      noLiveUnits = false,
    }: { health?: string; noLiveUnits?: boolean } = {}) => ({
      ...NO_AGENTS,
      summaryByInstanceId: {
        cloudtrail: {
          health,
          agent: { id: 'a1' },
          agentIds: ['a1'],
          liveAgentIds: noLiveUnits ? [] : ['a1'],
          ...(noLiveUnits && { noLiveUnits }),
        },
      },
      dataSourceByInstanceId: { cloudtrail: 'patterns' },
    });
    const HIT = { results: { 'logs-aws.cloudtrail-*': true } };

    it('polls index patterns for an agent-backed instance the agent data API cannot answer for', async () => {
      const { httpGet } = setup({
        serviceSettings: SINGLE,
        policyIdsByInstance: { cloudtrail: 'policy-1' },
        agentDetection: patternsInstance(),
      });
      renderHook(() => useServiceDataDetection());

      expect(mockUseQuery.mock.calls[0][0].enabled).toBe(true);
      await mockUseQuery.mock.calls[0][0].queryFn();
      expect(httpGet.mock.calls[0][1].query.dataStreams).toBe('logs-aws.cloudtrail-*');
    });

    it('is receiving when the patterns have data and the integration is running', () => {
      setup({
        serviceSettings: SINGLE,
        serviceStatuses: { cloudtrail: 'detecting' },
        policyIdsByInstance: { cloudtrail: 'policy-1' },
        agentDetection: patternsInstance(),
        queryData: HIT,
      });
      const { result } = renderHook(() => useServiceDataDetection());

      expect(result.current.statusByInstanceId.cloudtrail).toBe('receiving');
    });

    it('ignores a pattern hit while the integration runs no live unit', () => {
      // The hit can be another integration of the same package on the agent.
      setup({
        serviceSettings: SINGLE,
        serviceStatuses: { cloudtrail: 'detecting' },
        policyIdsByInstance: { cloudtrail: 'policy-1' },
        agentDetection: patternsInstance({ noLiveUnits: true }),
        queryData: HIT,
      });
      const { result } = renderHook(() => useServiceDataDetection());

      expect(result.current.statusByInstanceId.cloudtrail).toBe('detecting');
    });

    it('ignores a pattern hit before any agent exists, so an older integration cannot mark it', () => {
      // No agent yet: the summary is pending and no unit is flagged, but nothing is running.
      setup({
        serviceSettings: SINGLE,
        serviceStatuses: { cloudtrail: 'detecting' },
        policyIdsByInstance: { cloudtrail: 'policy-1' },
        agentDetection: {
          ...NO_AGENTS,
          summaryByInstanceId: {
            cloudtrail: { health: 'pending', agentIds: [], liveAgentIds: [] },
          },
          dataSourceByInstanceId: { cloudtrail: 'patterns' },
        },
        queryData: HIT,
      });
      const { result } = renderHook(() => useServiceDataDetection());

      expect(result.current.statusByInstanceId.cloudtrail).toBe('detecting');
    });

    it('does not persist receiving or stop polling before any agent exists', () => {
      const { updateDetectAndReviewStep } = setup({
        serviceSettings: SINGLE,
        serviceStatuses: { cloudtrail: 'detecting' },
        policyIdsByInstance: { cloudtrail: 'policy-1' },
        agentDetection: {
          ...NO_AGENTS,
          summaryByInstanceId: {
            cloudtrail: { health: 'pending', agentIds: [], liveAgentIds: [] },
          },
          dataSourceByInstanceId: { cloudtrail: 'patterns' },
        },
        queryData: HIT,
      });
      renderHook(() => useServiceDataDetection());

      expect(updateDetectAndReviewStep).not.toHaveBeenCalled();
      const { calls } = mockUseAgentDetection.mock;
      expect(calls[calls.length - 1][0].shouldPoll).toBe(true);
    });

    it('treats a Fleet-backed instance whose summary is not ready yet as having no agent', () => {
      setup({
        serviceSettings: SINGLE,
        serviceStatuses: { cloudtrail: 'detecting' },
        policyIdsByInstance: { cloudtrail: 'policy-1' },
        agentDetection: { ...NO_AGENTS, dataSourceByInstanceId: { cloudtrail: 'patterns' } },
        queryData: HIT,
      });
      const { result } = renderHook(() => useServiceDataDetection());

      expect(result.current.statusByInstanceId.cloudtrail).toBe('detecting');
    });

    it('still lets ECF, which has no agent, be detected from its patterns alone', () => {
      setup({
        serviceSettings: SINGLE,
        serviceStatuses: { cloudtrail: 'detecting' },
        queryData: HIT,
      });
      const { result } = renderHook(() => useServiceDataDetection());

      expect(result.current.statusByInstanceId.cloudtrail).toBe('receiving');
    });

    it('still shows an unhealthy agent as an error', () => {
      setup({
        serviceSettings: SINGLE,
        serviceStatuses: { cloudtrail: 'detecting' },
        policyIdsByInstance: { cloudtrail: 'policy-1' },
        agentDetection: patternsInstance({ health: 'unhealthy' }),
        queryData: HIT,
      });
      const { result } = renderHook(() => useServiceDataDetection());

      expect(result.current.statusByInstanceId.cloudtrail).toBe('error');
    });

    it('does not use the agent data signal for that instance', () => {
      setup({
        serviceSettings: SINGLE,
        serviceStatuses: { cloudtrail: 'detecting' },
        policyIdsByInstance: { cloudtrail: 'policy-1' },
        agentDetection: {
          ...patternsInstance(),
          hasDataByInstanceId: { cloudtrail: true },
        },
      });
      const { result } = renderHook(() => useServiceDataDetection());

      expect(result.current.statusByInstanceId.cloudtrail).toBe('detecting');
    });
  });
});

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
    category: 'compute',
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

  it('marks the service receiving when any instance namespace pattern has data', () => {
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
      serviceStatuses: { cloudtrail: 'detecting' },
      queryData: {
        results: { 'logs-aws.cloudtrail-prod': false, 'logs-aws.cloudtrail-staging': true },
      },
    });
    const { result } = renderHook(() => useServiceDataDetection());

    expect(result.current.statusByInstanceId.cloudtrail).toBe('receiving');
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
      summaryByInstanceId: { [instanceId]: { health, agent: { id: 'a1' }, agentIds: ['a1'] } },
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
            cloudtrail: { health: 'healthy', agent: { id: 'a1' }, agentIds: ['a1'] },
            'cloudtrail__dup-1': { health: 'healthy', agent: { id: 'a2' }, agentIds: ['a2'] },
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
            cloudtrail: { health: 'healthy', agent: { id: 'a1' }, agentIds: ['a1'] },
            'cloudtrail__dup-1': { health: 'healthy', agent: { id: 'a2' }, agentIds: ['a2'] },
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
            cloudtrail: { health: 'healthy', agent: { id: 'a1' }, agentIds: ['a1'] },
            'cloudtrail__dup-1': { health: 'unhealthy', agent: { id: 'a2' }, agentIds: ['a2'] },
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
});

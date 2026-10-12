/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';

jest.mock('react-use/lib/useSessionStorage');
jest.mock('../../onboarding_flow_context', () => ({
  useOnboardingFlow: jest.fn(),
}));

import { useOnboardingFlow } from '../../onboarding_flow_context';
import { getIncompleteInstances, useServiceSettings } from './use_service_settings';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { AWS_SERVICES_MAP } from '../../aws_service_matrix';
import type { RegistryVarsEntry } from '@kbn/fleet-plugin/common';

const mockUseOnboardingFlow = useOnboardingFlow as jest.MockedFunction<typeof useOnboardingFlow>;
const mockUseSessionStorage = useSessionStorage as jest.MockedFunction<typeof useSessionStorage>;

beforeEach(() => {
  mockUseSessionStorage.mockImplementation((_key, initial) => useState(initial));
  mockUseOnboardingFlow.mockReturnValue({
    servicesStep: { selectedServiceIds: ['guardduty'] },
    removeDeployInstance: jest.fn(),
    awsServicesMap: AWS_SERVICES_MAP,
  } as unknown as ReturnType<typeof useOnboardingFlow>);
});

// --- helpers for synthetic matrix entries ---

function makeEntry(
  id: string,
  overrides: Partial<AwsServiceMatrixEntry> = {}
): AwsServiceMatrixEntry {
  return {
    id,
    name: id,
    category: 'compute',
    signalTypes: ['logs'],
    dataStreams: [],
    deploymentMethods: [],
    showInUI: true,
    defaultEnabled: true,
    defaultEnabledInputs: [],
    packageName: 'aws',
    ...overrides,
  } as AwsServiceMatrixEntry;
}

function makeTextVarDef(name: string): RegistryVarsEntry {
  return { name, type: 'text', required: true, show_user: true } as RegistryVarsEntry;
}

// --- incompleteInstances ---

describe('useServiceSettings — incompleteInstances', () => {
  const svcWithRequired = makeEntry('svc_a', {
    signalTypes: ['logs'],
    dataStreams: ['svc_a'],
    inputs: ['aws-s3'],
    defaultEnabledInputs: ['aws-s3'],
    requiredConfig: ['bucket_arn'],
    varDefsByInput: { 'aws-s3': { bucket_arn: makeTextVarDef('bucket_arn') } },
    varDefsByDataStream: {
      svc_a: {
        inputs: ['aws-s3'],
        defaultEnabledInputs: ['aws-s3'],
        varDefsByInput: { 'aws-s3': { bucket_arn: makeTextVarDef('bucket_arn') } },
        requiredConfig: ['bucket_arn'],
      },
    },
  });

  beforeEach(() => {
    mockUseSessionStorage.mockImplementation((_key: string, initial: unknown) => useState(initial));
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: ['svc_a'] },
      removeDeployInstance: jest.fn(),
      awsServicesMap: new Map([['svc_a', svcWithRequired]]),
    } as unknown as ReturnType<typeof useOnboardingFlow>);
  });

  it('marks instance incomplete when required text var is empty', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));
    expect(result.current.incompleteInstances.map((i) => i.instanceId)).toContain('svc_a');
  });

  it('isReady is false when required var is empty even with region set', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));
    act(() => result.current.setGlobalRegion('us-east-1'));
    expect(result.current.isReady).toBe(false);
  });

  it('instance leaves incompleteInstances after required var is filled', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));
    act(() => result.current.setGlobalRegion('us-east-1'));
    act(() =>
      result.current.setServiceFieldsAndInputs(
        'svc_a',
        {
          svc_a: {
            enabledInputs: ['aws-s3'],
            varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::my-bucket' } },
          },
        },
        ['svc_a']
      )
    );
    expect(result.current.incompleteInstances).toHaveLength(0);
    expect(result.current.isReady).toBe(true);
  });

  it('duplicate instance also appears in incompleteInstances when its required var is empty', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));
    act(() => result.current.addDuplicate('svc_a', 'svc_a [Duplicate]', {}, []));
    expect(result.current.incompleteInstances.length).toBeGreaterThanOrEqual(2);
    expect(result.current.incompleteInstanceIds.has('svc_a__dup-1')).toBe(true);
  });
});

// --- namespace ---

describe('useServiceSettings — namespace', () => {
  const svcWithRequired = makeEntry('svc_a', {
    signalTypes: ['logs'],
    dataStreams: ['svc_a'],
    inputs: ['aws-s3'],
    defaultEnabledInputs: ['aws-s3'],
    requiredConfig: ['bucket_arn'],
    varDefsByInput: { 'aws-s3': { bucket_arn: makeTextVarDef('bucket_arn') } },
    varDefsByDataStream: {
      svc_a: {
        inputs: ['aws-s3'],
        defaultEnabledInputs: ['aws-s3'],
        varDefsByInput: { 'aws-s3': { bucket_arn: makeTextVarDef('bucket_arn') } },
        requiredConfig: ['bucket_arn'],
      },
    },
  });
  const filledVars = {
    svc_a: {
      enabledInputs: ['aws-s3'],
      varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::my-bucket' } },
    },
  };

  beforeEach(() => {
    mockUseSessionStorage.mockImplementation((_key: string, initial: unknown) => useState(initial));
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: ['svc_a'] },
      removeDeployInstance: jest.fn(),
      awsServicesMap: new Map([['svc_a', svcWithRequired]]),
    } as unknown as ReturnType<typeof useOnboardingFlow>);
  });

  it('persists the namespace alongside the instance vars', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));
    act(() => result.current.setServiceFieldsAndInputs('svc_a', filledVars, ['svc_a'], 'prod'));
    expect(result.current.getServiceVars('svc_a').namespace).toBe('prod');
  });

  it('copies the source namespace onto a duplicate when none is given', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));
    act(() => result.current.setServiceFieldsAndInputs('svc_a', filledVars, ['svc_a'], 'prod'));
    act(() => result.current.addDuplicate('svc_a', 'svc_a [Duplicate]', {}, []));
    expect(result.current.getServiceVars('svc_a__dup-1').namespace).toBe('prod');
  });

  it('uses the namespace given for a duplicate over the source one', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));
    act(() => result.current.setServiceFieldsAndInputs('svc_a', filledVars, ['svc_a'], 'prod'));
    act(() => result.current.addDuplicate('svc_a', 'svc_a [Duplicate]', {}, [], 'staging'));
    expect(result.current.getServiceVars('svc_a__dup-1').namespace).toBe('staging');
  });

  it('marks an instance incomplete when its namespace is invalid', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));
    act(() => result.current.setGlobalRegion('us-east-1'));
    act(() => result.current.setServiceFieldsAndInputs('svc_a', filledVars, ['svc_a'], 'Prod'));
    expect(result.current.incompleteInstanceIds.has('svc_a')).toBe(true);
    expect(result.current.isReady).toBe(false);
  });

  it('keeps an instance complete when its namespace is empty', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));
    act(() => result.current.setGlobalRegion('us-east-1'));
    act(() => result.current.setServiceFieldsAndInputs('svc_a', filledVars, ['svc_a'], ''));
    expect(result.current.incompleteInstances).toHaveLength(0);
    expect(result.current.isReady).toBe(true);
  });
});

// --- signal filter ---

describe('useServiceSettings — signal filter', () => {
  const svcLogs = makeEntry('svc_logs', { signalTypes: ['logs'], dataStreams: [] });
  const svcMetrics = makeEntry('svc_metrics', { signalTypes: ['metrics'], dataStreams: [] });

  beforeEach(() => {
    mockUseSessionStorage.mockImplementation((_key: string, initial: unknown) => useState(initial));
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: ['svc_logs', 'svc_metrics'] },
      removeDeployInstance: jest.fn(),
      awsServicesMap: new Map([
        ['svc_logs', svcLogs],
        ['svc_metrics', svcMetrics],
      ]),
    } as unknown as ReturnType<typeof useOnboardingFlow>);
  });

  it('shows all instances when filter is all', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));
    expect(result.current.filteredInstances).toHaveLength(2);
  });

  it('narrows to metrics instance when signal filter is metrics', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));
    act(() => result.current.setSignalFilter('metrics'));
    expect(result.current.filteredInstances).toHaveLength(1);
    expect(result.current.filteredInstances[0].instanceId).toBe('svc_metrics');
  });

  it('narrows to logs instance when signal filter is logs', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));
    act(() => result.current.setSignalFilter('logs'));
    expect(result.current.filteredInstances).toHaveLength(1);
    expect(result.current.filteredInstances[0].instanceId).toBe('svc_logs');
  });
});

// --- instanceId generation (existing) ---

describe('useServiceSettings — addDuplicate instanceId generation', () => {
  it('assigns __dup-1 for the first duplicate', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));

    act(() => {
      result.current.addDuplicate('guardduty', 'AWS GuardDuty [Duplicate]', {}, []);
    });

    const ids = result.current.instances.map((i) => i.instanceId);
    expect(ids).toContain('guardduty__dup-1');
  });

  it('assigns __dup-2 for the second duplicate', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));

    act(() => {
      result.current.addDuplicate('guardduty', 'AWS GuardDuty [Duplicate]', {}, []);
    });
    act(() => {
      result.current.addDuplicate('guardduty', 'AWS GuardDuty [Duplicate 2]', {}, []);
    });

    const ids = result.current.instances.map((i) => i.instanceId);
    expect(ids).toContain('guardduty__dup-1');
    expect(ids).toContain('guardduty__dup-2');
  });

  it('skips already-used id after remove+re-duplicate', () => {
    // Reproduces the collision scenario from the reviewer comment:
    // dup __dup-1 and __dup-2 exist; remove __dup-1; duplicate again.
    // Without the while-loop fix the new id would be __dup-2 (collision).
    // With the fix it must be __dup-3.
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));

    act(() => {
      result.current.addDuplicate('guardduty', 'AWS GuardDuty [Duplicate]', {}, []);
    });
    act(() => {
      result.current.addDuplicate('guardduty', 'AWS GuardDuty [Duplicate 2]', {}, []);
    });
    act(() => {
      result.current.removeInstance('guardduty__dup-1');
    });
    act(() => {
      result.current.addDuplicate('guardduty', 'AWS GuardDuty [Duplicate 3]', {}, []);
    });

    const ids = result.current.instances.map((i) => i.instanceId);
    expect(ids).not.toContain('guardduty__dup-1'); // removed
    expect(ids).toContain('guardduty__dup-2'); // still present
    expect(ids).toContain('guardduty__dup-3'); // new — not a collision
    expect(new Set(ids).size).toBe(ids.length); // all unique
  });
});

// ─── lazy serviceVars prune effect ───────────────────────────────────────────

describe('useServiceSettings — lazy serviceVars prune', () => {
  it('removes serviceVars entries whose instanceId is not in the current instance list', async () => {
    // Simulate a session where guardduty and a stale entry 'old_service' exist in serviceVars.
    // After mount the effect should prune 'old_service' because it has no matching instance.
    let storedState: unknown = {
      globalRegion: 'us-east-1',
      instances: [
        { instanceId: 'guardduty', serviceId: 'guardduty', name: 'GuardDuty', isDuplicate: false },
      ],
      serviceVars: {
        guardduty: { enabledDataStreams: ['guardduty'], varsByDataStream: {} },
        old_service: { enabledDataStreams: ['old_service'], varsByDataStream: {} },
      },
    };
    const setPersisted = jest.fn((updater: unknown) => {
      if (typeof updater === 'function') {
        storedState = (updater as Function)(storedState);
      } else {
        storedState = updater;
      }
    });
    mockUseSessionStorage.mockReturnValue([storedState, setPersisted]);
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: ['guardduty'] },
      removeDeployInstance: jest.fn(),
      awsServicesMap: AWS_SERVICES_MAP,
    } as unknown as ReturnType<typeof useOnboardingFlow>);

    renderHook(() => useServiceSettings({ onContinue: jest.fn() }));

    // setPersisted must have been called to prune the stale key.
    expect(setPersisted).toHaveBeenCalled();
    const written = (storedState as any).serviceVars;
    expect(written).toHaveProperty('guardduty');
    expect(written).not.toHaveProperty('old_service');
  });

  it('does not call setPersisted when there are no stale keys', () => {
    const storedState = {
      globalRegion: 'us-east-1',
      instances: [
        { instanceId: 'guardduty', serviceId: 'guardduty', name: 'GuardDuty', isDuplicate: false },
      ],
      serviceVars: {
        guardduty: { enabledDataStreams: ['guardduty'], varsByDataStream: {} },
      },
    };
    const setPersisted = jest.fn();
    mockUseSessionStorage.mockReturnValue([storedState, setPersisted]);
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: ['guardduty'] },
      removeDeployInstance: jest.fn(),
      awsServicesMap: AWS_SERVICES_MAP,
    } as unknown as ReturnType<typeof useOnboardingFlow>);

    renderHook(() => useServiceSettings({ onContinue: jest.fn() }));

    expect(setPersisted).not.toHaveBeenCalled();
  });

  it('preserves all valid entries and removes only stale ones', () => {
    const storedState = {
      globalRegion: '',
      instances: [
        { instanceId: 'svc_a', serviceId: 'svc_a', name: 'A', isDuplicate: false },
        { instanceId: 'svc_b', serviceId: 'svc_b', name: 'B', isDuplicate: false },
      ],
      serviceVars: {
        svc_a: { enabledDataStreams: [], varsByDataStream: {} },
        svc_b: { enabledDataStreams: [], varsByDataStream: {} },
        svc_stale: { enabledDataStreams: [], varsByDataStream: {} },
      },
    };
    const setPersisted = jest.fn();
    mockUseSessionStorage.mockReturnValue([storedState, setPersisted]);
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: ['svc_a', 'svc_b'] },
      removeDeployInstance: jest.fn(),
      awsServicesMap: AWS_SERVICES_MAP,
    } as unknown as ReturnType<typeof useOnboardingFlow>);

    renderHook(() => useServiceSettings({ onContinue: jest.fn() }));

    expect(setPersisted).toHaveBeenCalled();
    const call = setPersisted.mock.calls[0][0];
    expect(call.serviceVars).toHaveProperty('svc_a');
    expect(call.serviceVars).toHaveProperty('svc_b');
    expect(call.serviceVars).not.toHaveProperty('svc_stale');
  });
});

describe('getIncompleteInstances — required set follows the matrix view', () => {
  const def = (name: string) => ({ name, type: 'text', required: true, show_user: true } as any);
  const base = {
    id: 'cloudtrail',
    name: 'CloudTrail',
    dataStreams: ['cloudtrail'],
    inputs: ['aws-s3'],
    varDefsByInput: { 'aws-s3': { bucket_arn: def('bucket_arn'), queue_url: def('queue_url') } },
  } as unknown as AwsServiceMatrixEntry;
  const ecfView = { ...base, requiredConfig: ['bucket_arn'], settingsScope: 'ecf' as const };
  const agentView = { ...base, requiredConfig: ['bucket_arn', 'queue_url'] };
  const instances = [
    { instanceId: 'cloudtrail', serviceId: 'cloudtrail', name: 'CloudTrail', isDuplicate: false },
  ];
  const serviceVars = {
    cloudtrail: {
      enabledDataStreams: ['cloudtrail'],
      varsByDataStream: {
        cloudtrail: {
          enabledInputs: ['aws-s3'],
          varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::b' } },
        },
      },
    },
  };

  it('is complete with only the ARN under the ECF view', () => {
    expect(
      getIncompleteInstances(instances, serviceVars, new Map([['cloudtrail', ecfView]]))
    ).toEqual([]);
  });

  it('is incomplete under the agent-based view until the extra required var is filled', () => {
    const map = new Map([['cloudtrail', agentView]]);
    expect(getIncompleteInstances(instances, serviceVars, map)).toHaveLength(1);

    const filled = {
      cloudtrail: {
        ...serviceVars.cloudtrail,
        varsByDataStream: {
          cloudtrail: {
            enabledInputs: ['aws-s3'],
            varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::b', queue_url: 'https://q' } },
          },
        },
      },
    };
    expect(getIncompleteInstances(instances, filled, map)).toEqual([]);
  });

  it.each([
    ['aws-s3', 'bucket_arn', 'queue_url'],
    ['aws-cloudwatch', 'log_group_arn', 'log_group_name'],
  ])(
    'requires one %s source var for an ECF-capable service under agent-based',
    (input, primary, alternative) => {
      // The manifest marks every source var optional, so requiredConfig alone cannot catch this.
      const optional = (name: string) => ({ name, type: 'text', required: false, show_user: true });
      const service = {
        ...base,
        inputs: [input],
        requiredConfig: [],
        optionalConfig: [primary, alternative],
        varDefsByInput: {
          [input]: { [primary]: optional(primary), [alternative]: optional(alternative) },
        },
        ecfSettings: {
          requiredConfig: [primary],
          dataStreams: [],
          inputs: [input],
          defaultEnabledInputs: [],
        },
      } as unknown as AwsServiceMatrixEntry;
      const map = new Map([['cloudtrail', service]]);
      const withVars = (vars: Record<string, string | string[]>) => ({
        cloudtrail: {
          enabledDataStreams: ['cloudtrail'],
          varsByDataStream: {
            cloudtrail: { enabledInputs: [input], varsByInput: { [input]: vars } },
          },
        },
      });

      expect(getIncompleteInstances(instances, withVars({ [primary]: '' }), map)).toHaveLength(1);
      expect(getIncompleteInstances(instances, withVars({ [primary]: [] }), map)).toHaveLength(1);
      expect(getIncompleteInstances(instances, withVars({ [primary]: ['x'] }), map)).toEqual([]);
      expect(getIncompleteInstances(instances, withVars({ [alternative]: 'y' }), map)).toEqual([]);
      // The ECF view keeps relying on the ARN-only requiredConfig.
      expect(
        getIncompleteInstances(
          instances,
          withVars({ [primary]: '' }),
          new Map([['cloudtrail', { ...service, settingsScope: 'ecf' as const }]])
        )
      ).toEqual([]);
    }
  );

  it('under ECF, ignores a stored input ECF cannot route and requires a supported one', () => {
    // WAF: agent-based allows CloudWatch, ECF routes S3 only (ecfInputs). A CloudWatch-only
    // selection left over from agent-based must not count as a complete ECF config.
    const optionalVar = (name: string) => ({
      name,
      type: 'text',
      required: false,
      show_user: true,
    });
    const wafEcfView = {
      ...base,
      dataStreams: ['waf'],
      inputs: ['aws-s3'],
      ecfInputs: ['aws-s3'],
      settingsScope: 'ecf' as const,
      requiredConfig: ['bucket_arn'],
      varDefsByInput: {
        'aws-s3': { bucket_arn: { ...optionalVar('bucket_arn'), required: true } },
        'aws-cloudwatch': { log_group_arn: optionalVar('log_group_arn') },
      },
      varDefsByDataStream: {
        waf: {
          inputs: ['aws-s3', 'aws-cloudwatch'],
          defaultEnabledInputs: ['aws-s3'],
          varDefsByInput: {
            'aws-s3': { bucket_arn: { ...optionalVar('bucket_arn'), required: true } },
            'aws-cloudwatch': { log_group_arn: optionalVar('log_group_arn') },
          },
        },
      },
    } as unknown as AwsServiceMatrixEntry;
    const map = new Map([['cloudtrail', wafEcfView]]);
    const withInputs = (
      enabledInputs: string[],
      varsByInput: Record<string, Record<string, string>>
    ) => ({
      cloudtrail: {
        enabledDataStreams: ['waf'],
        varsByDataStream: { waf: { enabledInputs, varsByInput } },
      },
    });

    // CloudWatch only, with a log group: nothing ECF can route.
    expect(
      getIncompleteInstances(
        instances,
        withInputs(['aws-cloudwatch'], { 'aws-cloudwatch': { log_group_arn: 'arn:lg' } }),
        map
      )
    ).toHaveLength(1);
    // Both selected: the S3 side decides, and its bucket ARN is missing.
    expect(
      getIncompleteInstances(
        instances,
        withInputs(['aws-s3', 'aws-cloudwatch'], { 'aws-cloudwatch': { log_group_arn: 'arn:lg' } }),
        map
      )
    ).toHaveLength(1);
    // Both selected with a bucket ARN: complete (the CloudWatch value is just preserved).
    expect(
      getIncompleteInstances(
        instances,
        withInputs(['aws-s3', 'aws-cloudwatch'], {
          'aws-s3': { bucket_arn: 'arn:b' },
          'aws-cloudwatch': { log_group_arn: 'arn:lg' },
        }),
        map
      )
    ).toEqual([]);
  });
});

describe('useServiceSettings — handleNext', () => {
  it('records the deployment method the settings were confirmed under, then continues', () => {
    const setServiceSettingsMethod = jest.fn();
    const onContinue = jest.fn();
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: ['guardduty'] },
      removeDeployInstance: jest.fn(),
      awsServicesMap: AWS_SERVICES_MAP,
      deploymentMethod: 'agent_based',
      setServiceSettingsMethod,
    } as unknown as ReturnType<typeof useOnboardingFlow>);

    const { result } = renderHook(() => useServiceSettings({ onContinue }));
    act(() => result.current.handleNext());

    expect(setServiceSettingsMethod).toHaveBeenCalledWith('agent_based');
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import {
  getRegionFieldName,
  buildStreamVars,
  buildPackageInputs,
  collectDeployResults,
  useDeploy,
} from './use_deploy';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';

jest.mock('@kbn/fleet-plugin/public', () => ({
  sendCreateAgentlessPolicy: jest.fn(),
  sendGetPackageInfoByKey: jest.fn(),
}));

jest.mock('../../onboarding_flow_context', () => ({
  useOnboardingFlow: jest.fn(),
}));

jest.mock('react-use/lib/useSessionStorage', () => jest.fn());

import { sendCreateAgentlessPolicy, sendGetPackageInfoByKey } from '@kbn/fleet-plugin/public';
import { useOnboardingFlow } from '../../onboarding_flow_context';
import useSessionStorage from 'react-use/lib/useSessionStorage';

const mockSendCreateAgentlessPolicy = sendCreateAgentlessPolicy as jest.Mock;
const mockSendGetPackageInfoByKey = sendGetPackageInfoByKey as jest.Mock;
const mockUseOnboardingFlow = useOnboardingFlow as jest.Mock;
const mockUseSessionStorage = useSessionStorage as jest.Mock;

// ─── Fixtures ───────────────────────────────────────────────────────────────

function makeService(overrides: Partial<AwsServiceMatrixEntry> = {}): AwsServiceMatrixEntry {
  return {
    id: 'test_service',
    name: 'Test Service',
    category: 'Compute',
    signalType: 'logs',
    packageName: 'aws',
    deliveryMethods: [{ method: 'agentless', preferred: true }],
    inputs: ['aws-s3'],
    requiredConfig: ['region'],
    identityFederationSupported: true,
    defaultEnabled: false,
    showInUI: true,
    ...overrides,
  };
}

// ─── getRegionFieldName ──────────────────────────────────────────────────────

describe('getRegionFieldName', () => {
  it('returns "region" for aws-s3 transport with region in requiredConfig', () => {
    const service = makeService({ requiredConfig: ['region'] });
    expect(getRegionFieldName(service, 'aws-s3')).toBe('region');
  });

  it('returns "region_name" for aws-cloudwatch transport with region_name in requiredConfig', () => {
    const service = makeService({ requiredConfig: ['region_name'] });
    expect(getRegionFieldName(service, 'aws-cloudwatch')).toBe('region_name');
  });

  it('returns "aws_region" when requiredConfig contains aws_region', () => {
    const service = makeService({ requiredConfig: ['aws_region'] });
    expect(getRegionFieldName(service, null)).toBe('aws_region');
  });

  it('returns empty string when no region field matches', () => {
    const service = makeService({ requiredConfig: ['regions'] });
    expect(getRegionFieldName(service, null)).toBe('');
  });

  it('returns empty string when requiredConfig is absent', () => {
    const service = makeService({ requiredConfig: undefined });
    expect(getRegionFieldName(service, 'aws-s3')).toBe('');
  });
});

// ─── buildStreamVars ─────────────────────────────────────────────────────────

describe('buildStreamVars', () => {
  it('passes through non-boolean vars as strings', () => {
    const service = makeService({ requiredConfig: ['region'] });
    const vars = buildStreamVars(service, { trigger: 'aws-s3', vars: { foo: 'bar' } }, '');
    expect(vars.foo).toBe('bar');
  });

  it('coerces boolean var names to boolean type', () => {
    const service = makeService({ requiredConfig: ['region'] });
    const vars = buildStreamVars(
      service,
      { trigger: 'aws-s3', vars: { preserve_original_event: 'true', collect_s3_logs: 'false' } },
      ''
    );
    expect(vars.preserve_original_event).toBe(true);
    expect(vars.collect_s3_logs).toBe(false);
  });

  it('falls back to globalRegion for single-region field when var is absent', () => {
    const service = makeService({ requiredConfig: ['region'] });
    const vars = buildStreamVars(service, { trigger: 'aws-s3', vars: {} }, 'us-east-1');
    expect(vars.region).toBe('us-east-1');
  });

  it('does not override existing region var with globalRegion', () => {
    const service = makeService({ requiredConfig: ['region'] });
    const vars = buildStreamVars(
      service,
      { trigger: 'aws-s3', vars: { region: 'eu-west-1' } },
      'us-east-1'
    );
    expect(vars.region).toBe('eu-west-1');
  });

  it('falls back to globalRegion for the "regions" list field', () => {
    const service = makeService({ inputs: ['aws/metrics'], requiredConfig: ['regions'] });
    const vars = buildStreamVars(service, { trigger: null, vars: {} }, 'ap-southeast-1');
    expect(vars.regions).toBe('ap-southeast-1');
  });

  it('does not override existing regions var with globalRegion', () => {
    const service = makeService({ inputs: ['aws/metrics'], requiredConfig: ['regions'] });
    const vars = buildStreamVars(
      service,
      { trigger: null, vars: { regions: 'eu-central-1' } },
      'us-east-1'
    );
    expect(vars.regions).toBe('eu-central-1');
  });
});

// ─── buildPackageInputs ──────────────────────────────────────────────────────

describe('buildPackageInputs', () => {
  it('builds inputs keyed by policyTemplate-inputType with a stream per service', () => {
    const service = makeService({
      id: 'ec2_logs',
      packageName: 'aws',
      policyTemplate: 'ec2',
      inputs: ['aws-s3'],
    });
    const inputs = buildPackageInputs(
      [service],
      { ec2_logs: { trigger: 'aws-s3', vars: {} } },
      'us-east-1'
    );

    expect(inputs['ec2-aws-s3']).toBeDefined();
    expect(inputs['ec2-aws-s3'].enabled).toBe(true);
    expect(inputs['ec2-aws-s3'].streams['aws.ec2_logs']).toBeDefined();
    expect(inputs['ec2-aws-s3'].streams['aws.ec2_logs'].enabled).toBe(true);
  });

  it('uses bare inputType as key when no policyTemplate is set', () => {
    const service = makeService({ id: 'ec2_logs', inputs: ['aws-s3'], policyTemplate: undefined });
    const inputs = buildPackageInputs([service], { ec2_logs: { trigger: 'aws-s3', vars: {} } }, '');
    expect(inputs['aws-s3']).toBeDefined();
  });

  it('creates input entries without input-level vars (credentials/region are package-level)', () => {
    const service = makeService({
      id: 'ec2_metrics',
      policyTemplate: 'ec2',
      inputs: ['aws/metrics'],
    });
    const inputs = buildPackageInputs(
      [service],
      { ec2_metrics: { trigger: null, vars: {} } },
      'us-west-2'
    );
    expect(inputs['ec2-aws/metrics']).toBeDefined();
    expect(inputs['ec2-aws/metrics'].vars).toBeUndefined();
  });

  it('creates separate input entries for services with different policyTemplates', () => {
    const service1 = makeService({ id: 'ec2_logs', policyTemplate: 'ec2', inputs: ['aws-s3'] });
    const service2 = makeService({ id: 'emr_logs', policyTemplate: 'emr', inputs: ['aws-s3'] });
    const inputs = buildPackageInputs(
      [service1, service2],
      {
        ec2_logs: { trigger: 'aws-s3', vars: {} },
        emr_logs: { trigger: 'aws-s3', vars: {} },
      },
      ''
    );
    expect(Object.keys(inputs)).toHaveLength(2);
    expect(inputs['ec2-aws-s3'].streams['aws.ec2_logs']).toBeDefined();
    expect(inputs['emr-aws-s3'].streams['aws.emr_logs']).toBeDefined();
  });

  it('falls back to first input type from service when serviceVars has no trigger', () => {
    const service = makeService({
      id: 'ec2_logs',
      policyTemplate: 'ec2',
      inputs: ['aws-cloudwatch'],
    });
    const inputs = buildPackageInputs([service], {}, '');
    expect(inputs['ec2-aws-cloudwatch']).toBeDefined();
  });

  it('skips services with no resolvable input type', () => {
    const service = makeService({ id: 'no_input', inputs: [] });
    const inputs = buildPackageInputs([service], { no_input: { trigger: null, vars: {} } }, '');
    expect(Object.keys(inputs)).toHaveLength(0);
  });
});

// ─── collectDeployResults ────────────────────────────────────────────────────

describe('collectDeployResults', () => {
  it('maps fulfilled results to success status', () => {
    const results: PromiseSettledResult<void>[] = [{ status: 'fulfilled', value: undefined }];
    const { nextStatuses, anyFailed } = collectDeployResults(results, ['aws']);
    expect(nextStatuses.aws.status).toBe('success');
    expect(anyFailed).toBe(false);
  });

  it('maps rejected results to error status with message', () => {
    const results: PromiseSettledResult<void>[] = [
      { status: 'rejected', reason: new Error('Network failure') },
    ];
    const { nextStatuses, anyFailed } = collectDeployResults(results, ['aws']);
    expect(nextStatuses.aws.status).toBe('error');
    expect(nextStatuses.aws.errorMessage).toBe('Network failure');
    expect(anyFailed).toBe(true);
  });

  it('handles string rejection reasons', () => {
    const results: PromiseSettledResult<void>[] = [{ status: 'rejected', reason: 'string error' }];
    const { nextStatuses } = collectDeployResults(results, ['aws']);
    expect(nextStatuses.aws.errorMessage).toBe('string error');
  });

  it('handles plain-object rejection reasons (Fleet API error shape)', () => {
    const results: PromiseSettledResult<void>[] = [
      {
        status: 'rejected',
        reason: { statusCode: 404, error: 'Not Found', message: 'Saved object not found' },
      },
    ];
    const { nextStatuses } = collectDeployResults(results, ['aws']);
    expect(nextStatuses.aws.errorMessage).toBe('Saved object not found');
  });

  it('handles mixed results and sets anyFailed when at least one fails', () => {
    const results: PromiseSettledResult<void>[] = [
      { status: 'fulfilled', value: undefined },
      { status: 'rejected', reason: new Error('fail') },
    ];
    const { nextStatuses, anyFailed } = collectDeployResults(results, ['pkg-a', 'pkg-b']);
    expect(nextStatuses['pkg-a'].status).toBe('success');
    expect(nextStatuses['pkg-b'].status).toBe('error');
    expect(anyFailed).toBe(true);
  });
});

// ─── useDeploy hook ──────────────────────────────────────────────────────────

function setupMocks({
  selectedServiceIds = ['ec2_metrics'],
  connectorId = undefined as string | undefined,
  staticKeys = undefined as { access_key_id: string; secret_access_key: string } | undefined,
  globalRegion = 'us-east-1',
  pkgVersion = '2.0.0',
}: {
  selectedServiceIds?: string[];
  connectorId?: string;
  staticKeys?: { access_key_id: string; secret_access_key: string };
  globalRegion?: string;
  pkgVersion?: string;
} = {}) {
  mockUseOnboardingFlow.mockReturnValue({
    servicesStep: { selectedServiceIds },
    connectStep: { connectorId, staticKeys },
    deployStep: { isDeploying: false, packageStatuses: {} },
    updateDeployStep: jest.fn(),
    registerDeployHandler: jest.fn(),
    retryDeploy: jest.fn(),
  });

  mockUseSessionStorage.mockReturnValue([{ globalRegion, serviceVars: {} }, jest.fn()]);

  mockSendGetPackageInfoByKey.mockResolvedValue({
    data: { item: { version: pkgVersion } },
  });

  mockSendCreateAgentlessPolicy.mockResolvedValue({ data: {} });
}

describe('useDeploy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default namespace and idle state', () => {
    setupMocks();
    const { result } = renderHook(() => useDeploy({ onContinue: jest.fn() }));

    expect(result.current.namespace).toBe('default');
    expect(result.current.isDeploying).toBe(false);
    expect(result.current.failedPackages).toEqual([]);
  });

  it('navigates immediately and completes API call on success', async () => {
    setupMocks({ selectedServiceIds: ['ec2_metrics'] });
    const onContinue = jest.fn();
    const { result } = renderHook(() => useDeploy({ onContinue }));

    await act(async () => {
      await result.current.handleDeploy();
    });

    expect(mockSendCreateAgentlessPolicy).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('navigates immediately even when deployment fails', async () => {
    setupMocks({ selectedServiceIds: ['ec2_metrics'] });
    mockSendCreateAgentlessPolicy.mockRejectedValue(new Error('API error'));
    const onContinue = jest.fn();
    const { result } = renderHook(() => useDeploy({ onContinue }));

    await act(async () => {
      await result.current.handleDeploy();
    });

    expect(result.current.failedPackages).toContain('aws');
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('is not loading after deployment finishes', async () => {
    setupMocks();
    const { result } = renderHook(() => useDeploy({ onContinue: jest.fn() }));

    await act(async () => {
      await result.current.handleDeploy();
    });

    expect(result.current.isDeploying).toBe(false);
  });

  it('retries only the specified failed packages without navigating again', async () => {
    setupMocks({ selectedServiceIds: ['ec2_metrics'] });
    mockSendCreateAgentlessPolicy
      .mockRejectedValueOnce(new Error('first fail'))
      .mockResolvedValueOnce({ data: {} });
    const onContinue = jest.fn();
    const { result } = renderHook(() => useDeploy({ onContinue }));

    await act(async () => {
      await result.current.handleDeploy();
    });
    expect(result.current.failedPackages).toContain('aws');
    expect(onContinue).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.handleDeploy(['aws']);
    });
    expect(result.current.failedPackages).toHaveLength(0);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('passes cloud_connector when connectorId is set (identity federation path)', async () => {
    setupMocks({ selectedServiceIds: ['ec2_metrics'], connectorId: 'connector-123' });
    const { result } = renderHook(() => useDeploy({ onContinue: jest.fn() }));

    await act(async () => {
      await result.current.handleDeploy();
    });

    expect(mockSendCreateAgentlessPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        cloud_connector: { enabled: true, cloud_connector_id: 'connector-123' },
      })
    );
  });

  it('passes static keys as package-level vars when no connectorId', async () => {
    setupMocks({
      selectedServiceIds: ['ec2_metrics'],
      connectorId: undefined,
      staticKeys: { access_key_id: 'AKID', secret_access_key: 'SECRET' },
    });
    const { result } = renderHook(() => useDeploy({ onContinue: jest.fn() }));

    await act(async () => {
      await result.current.handleDeploy();
    });

    expect(mockSendCreateAgentlessPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        vars: expect.objectContaining({ access_key_id: 'AKID', secret_access_key: 'SECRET' }),
      })
    );
    expect(mockSendCreateAgentlessPolicy).toHaveBeenCalledWith(
      expect.not.objectContaining({ cloud_connector: expect.anything() })
    );
  });

  it('calls onContinue immediately when no agentless services are selected', async () => {
    setupMocks({ selectedServiceIds: [] });
    const onContinue = jest.fn();
    const { result } = renderHook(() => useDeploy({ onContinue }));

    await act(async () => {
      await result.current.handleDeploy();
    });

    expect(mockSendCreateAgentlessPolicy).not.toHaveBeenCalled();
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('throws when package version cannot be resolved', async () => {
    setupMocks({ selectedServiceIds: ['ec2_metrics'] });
    mockSendGetPackageInfoByKey.mockResolvedValue({ data: { item: { version: undefined } } });
    const { result } = renderHook(() => useDeploy({ onContinue: jest.fn() }));

    await act(async () => {
      await result.current.handleDeploy();
    });

    expect(result.current.failedPackages).toContain('aws');
  });
});

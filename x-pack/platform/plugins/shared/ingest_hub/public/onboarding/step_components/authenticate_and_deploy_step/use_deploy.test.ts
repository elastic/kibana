/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import { getRegionFieldName, buildStreamVars, buildPackageInputs, useDeploy } from './use_deploy';
import { collectDeployResults, buildInstanceStatuses } from './deploy_groups';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { RegistryVarsEntry } from '@kbn/fleet-plugin/common';

function makeVarDef(
  name: string,
  type: RegistryVarsEntry['type'],
  opts: Partial<RegistryVarsEntry> = {}
): RegistryVarsEntry {
  return { name, type, title: name, ...opts } as RegistryVarsEntry;
}

jest.mock('@kbn/fleet-plugin/public', () => ({
  sendCreateAgentlessPolicy: jest.fn(),
  sendGetPackageInfoByKey: jest.fn(),
}));

jest.mock('../../use_aws_service_matrix', () => {
  const { AWS_SERVICES_STATIC, buildAwsServiceMatrix } = jest.requireActual(
    '../../aws_service_matrix'
  ) as any;
  const policyTemplates = (AWS_SERVICES_STATIC as any[])
    .filter((e: any) => e.packageName === 'aws')
    .map((e: any) => ({
      name: e.id,
      data_streams: [e.id],
      // Preserve ECF-only designation: don't add agentless for services whose static entry
      // declares only ecf deployment methods (e.g. cloudtrail, waf, vpcflow).
      ...(e.deploymentMethods && e.deploymentMethods.every((dm: any) => dm.method === 'ecf')
        ? {}
        : { deployment_modes: { agentless: { enabled: true } } }),
    }));
  // Provide data streams for aws entries with correct input types so deployment input keys
  // (e.g. 'ec2-aws/metrics') are generated correctly in useDeploy tests.
  const AWS_INPUT_MAP: Record<string, string[]> = {
    apigateway_logs: ['aws-s3', 'aws-cloudwatch'],
    apigateway_metrics: ['aws/metrics'],
    lambda: ['aws/metrics'],
    lambda_logs: ['aws-cloudwatch'],
    ec2_logs: ['aws-s3', 'aws-cloudwatch'],
    ec2_metrics: ['aws/metrics'],
    ecs_metrics: ['aws/metrics'],
    emr_logs: ['aws-s3', 'aws-cloudwatch'],
    emr_metrics: ['aws/metrics'],
    awshealth: ['aws/metrics'],
    cloudwatch_logs: ['aws-cloudwatch'],
    cloudwatch_metrics: ['aws/metrics'],
    billing: ['aws/metrics'],
    usage: ['aws/metrics'],
    cloudtrail: ['aws-s3', 'aws-cloudwatch'],
    config: ['cel'],
    guardduty: ['aws-s3', 'httpjson'],
    inspector: ['httpjson'],
    firewall_logs: ['aws-s3', 'aws-cloudwatch'],
    firewall_metrics: ['aws/metrics'],
    securityhub_findings: ['httpjson'],
    securityhub_findings_full_posture: ['httpjson'],
    securityhub_insights: ['httpjson'],
    waf: ['aws-s3', 'aws-cloudwatch'],
    cloudfront_logs: ['aws-s3'],
    elb_logs: ['aws-s3', 'aws-cloudwatch'],
    elb_metrics: ['aws/metrics'],
    natgateway: ['aws/metrics'],
    route53_public_logs: ['aws-cloudwatch'],
    route53_resolver_logs: ['aws-s3', 'aws-cloudwatch'],
    transitgateway: ['aws/metrics'],
    vpcflow: ['aws-s3', 'aws-cloudwatch'],
    vpn: ['aws/metrics'],
    ebs: ['aws/metrics'],
    s3_daily_storage: ['aws/metrics'],
    s3_request: ['aws/metrics'],
    s3access: ['aws-s3'],
    s3_storage_lens: ['aws/metrics'],
    dynamodb: ['aws/metrics'],
    rds: ['aws/metrics'],
    redshift: ['aws/metrics'],
    kafka_metrics: ['aws/metrics'],
    kinesis: ['aws/metrics'],
    sns: ['aws/metrics'],
    sqs: ['aws/metrics'],
  };
  const dataStreams = (AWS_SERVICES_STATIC as any[])
    .filter((e: any) => e.packageName === 'aws')
    .map((e: any) => {
      const inputList: string[] = AWS_INPUT_MAP[e.id] ?? ['aws-s3'];
      return {
        path: e.id,
        type: inputList[0].includes('metrics') ? 'metrics' : 'logs',
        streams: inputList.map((input: string) => ({ input, vars: [], enabled: true })),
      };
    });
  const mockPackages = {
    aws: { policy_templates: policyTemplates, data_streams: dataStreams },
    aws_bedrock: { policy_templates: [], data_streams: [] },
    aws_bedrock_agentcore: { policy_templates: [], data_streams: [] },
    awsfargate: { policy_templates: [], data_streams: [] },
    aws_mq: { policy_templates: [], data_streams: [] },
    aws_cloudtrail_otel: { policy_templates: [], data_streams: [] },
    aws_vpcflow_otel: { policy_templates: [], data_streams: [] },
    aws_waf_otel: { policy_templates: [], data_streams: [] },
    aws_logs: { policy_templates: [], data_streams: [] },
  };
  const matrix = buildAwsServiceMatrix(mockPackages, AWS_SERVICES_STATIC);
  const servicesMap = new Map(matrix.map((s: any) => [s.id, s]));
  return {
    useAwsServiceMatrix: jest.fn().mockReturnValue({ matrix, isError: false, refetch: jest.fn() }),
    useAwsServicesMap: jest.fn().mockReturnValue(servicesMap),
  };
});

jest.mock('../../onboarding_flow_context', () => ({
  useOnboardingFlow: jest.fn(),
}));

jest.mock('react-use/lib/useSessionStorage', () => jest.fn());

import { sendCreateAgentlessPolicy, sendGetPackageInfoByKey } from '@kbn/fleet-plugin/public';
import { useOnboardingFlow } from '../../onboarding_flow_context';
import { useAwsServicesMap } from '../../use_aws_service_matrix';
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
    category: 'compute',
    signalTypes: ['logs'],
    dataStreams: ['test_service'],
    packageName: 'aws',
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    inputs: ['aws-s3'],
    requiredConfig: ['region'],
    identityFederationSupported: true,
    defaultEnabled: false,
    defaultEnabledInputs: [],
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
    const vars = buildStreamVars(
      service,
      { enabledInputs: ['aws-s3'], varsByInput: { 'aws-s3': { foo: 'bar' } } },
      '',
      'aws-s3'
    );
    expect(vars.foo).toBe('bar');
  });

  it('coerces boolean var names to boolean type', () => {
    const service = makeService({
      requiredConfig: ['region'],
      varDefsByInput: {
        'aws-s3': {
          preserve_original_event: makeVarDef('preserve_original_event', 'bool'),
          collect_s3_logs: makeVarDef('collect_s3_logs', 'bool'),
        },
      },
    });
    const vars = buildStreamVars(
      service,
      {
        enabledInputs: ['aws-s3'],
        varsByInput: { 'aws-s3': { preserve_original_event: 'true', collect_s3_logs: 'false' } },
      },
      '',
      'aws-s3'
    );
    expect(vars.preserve_original_event).toBe(true);
    expect(vars.collect_s3_logs).toBe(false);
  });

  it('falls back to globalRegion for single-region field when var is absent', () => {
    // varDefsByInput must include the region field — the backfill only fires when
    // resolveFieldMeta confirms it is a real stream-level var (prevents emitting
    // input-level vars like aws_region for guardduty into stream vars).
    const service = makeService({
      requiredConfig: ['region'],
      varDefsByInput: { 'aws-s3': { region: makeVarDef('region', 'text') } },
    });
    const vars = buildStreamVars(
      service,
      { enabledInputs: ['aws-s3'], varsByInput: {} },
      'us-east-1',
      'aws-s3'
    );
    expect(vars.region).toBe('us-east-1');
  });

  it('does not backfill region when the field is absent from varDefsByInput (input-level var)', () => {
    // Regression: services like guardduty have aws_region as an input-level manifest var,
    // not a stream-level one. getRegionFieldName returns 'aws_region' (it is in requiredConfig),
    // but resolveFieldMeta returns undefined because varDefsByInput has no entry for it.
    // Without the guard the backfill emits aws_region into streams[].vars and Fleet rejects
    // the policy with "Variable ... aws_region not found".
    const service = makeService({
      requiredConfig: ['aws_region'],
      // varDefsByInput intentionally omits 'aws_region' — simulates an input-level var
      varDefsByInput: {},
    });
    const vars = buildStreamVars(
      service,
      { enabledInputs: ['aws-s3'], varsByInput: {} },
      'us-east-1',
      'aws-s3'
    );
    expect(vars).not.toHaveProperty('aws_region');
  });

  it('does not override existing region var with globalRegion', () => {
    const service = makeService({ requiredConfig: ['region'] });
    const vars = buildStreamVars(
      service,
      { enabledInputs: ['aws-s3'], varsByInput: { 'aws-s3': { region: 'eu-west-1' } } },
      'us-east-1',
      'aws-s3'
    );
    expect(vars.region).toBe('eu-west-1');
  });

  it('does not emit regions when not explicitly set (optional field, package default applies)', () => {
    const service = makeService({ requiredConfig: [], optionalConfig: ['regions'] });
    const vars = buildStreamVars(
      service,
      { enabledInputs: ['aws-s3'], varsByInput: {} },
      'us-east-1',
      'aws-s3'
    );
    expect(vars).not.toHaveProperty('regions');
  });

  it('emits explicitly set regions as a string array (split on comma)', () => {
    const service = makeService({
      requiredConfig: [],
      optionalConfig: ['regions'],
      varDefsByInput: {
        'aws-s3': { regions: makeVarDef('regions', 'text', { multi: true }) },
      },
    });
    const vars = buildStreamVars(
      service,
      { enabledInputs: ['aws-s3'], varsByInput: { 'aws-s3': { regions: 'us-east-1,eu-west-1' } } },
      'ap-southeast-1',
      'aws-s3'
    );
    expect(vars.regions).toEqual(['us-east-1', 'eu-west-1']);
  });

  it('does not emit regions when optionalConfig is absent', () => {
    const service = makeService({ requiredConfig: ['region'] });
    const vars = buildStreamVars(
      service,
      { enabledInputs: ['aws-s3'], varsByInput: {} },
      'us-east-1',
      'aws-s3'
    );
    expect(vars).not.toHaveProperty('regions');
  });

  it('does not emit metrics when not stored in vars', () => {
    const service = makeService({ requiredConfig: [], optionalConfig: ['regions', 'metrics'] });
    const vars = buildStreamVars(
      service,
      { enabledInputs: ['aws-s3'], varsByInput: {} },
      'us-east-1',
      'aws-s3'
    );
    expect(vars).not.toHaveProperty('metrics');
  });
});

// ─── buildPackageInputs ──────────────────────────────────────────────────────

describe('buildPackageInputs', () => {
  it('builds inputs keyed by serviceId-inputType with a stream per data stream', () => {
    const service = makeService({
      id: 'ec2',
      packageName: 'aws',
      dataStreams: ['ec2_logs'],
      inputs: ['aws-s3'],
    });
    const inputs = buildPackageInputs(
      [service],
      {
        ec2: {
          enabledDataStreams: ['ec2_logs'],
          varsByDataStream: { ec2_logs: { enabledInputs: ['aws-s3'], varsByInput: {} } },
        },
      },
      'us-east-1'
    );

    expect(inputs['ec2-aws-s3']).toBeDefined();
    expect(inputs['ec2-aws-s3'].enabled).toBe(true);
    expect(inputs['ec2-aws-s3'].streams['aws.ec2_logs']).toBeDefined();
    expect(inputs['ec2-aws-s3'].streams['aws.ec2_logs'].enabled).toBe(true);
  });

  it('builds input key as serviceId-inputType', () => {
    const service = makeService({
      id: 'test_service',
      dataStreams: ['test_ds'],
      inputs: ['aws-s3'],
    });
    const inputs = buildPackageInputs(
      [service],
      {
        test_service: {
          enabledDataStreams: ['test_ds'],
          varsByDataStream: { test_ds: { enabledInputs: ['aws-s3'], varsByInput: {} } },
        },
      },
      ''
    );
    expect(inputs['test_service-aws-s3']).toBeDefined();
  });

  it('creates input entries without input-level vars (credentials/region are package-level)', () => {
    const service = makeService({
      id: 'ec2',
      dataStreams: ['ec2_metrics'],
      inputs: ['aws/metrics'],
    });
    const inputs = buildPackageInputs(
      [service],
      {
        ec2: {
          enabledDataStreams: ['ec2_metrics'],
          varsByDataStream: { ec2_metrics: { enabledInputs: ['aws/metrics'], varsByInput: {} } },
        },
      },
      'us-west-2'
    );
    expect(inputs['ec2-aws/metrics']).toBeDefined();
    // PackageInputEntry has no top-level vars — cast to verify no accidental addition at runtime.
    expect((inputs['ec2-aws/metrics'] as any).vars).toBeUndefined();
  });

  it('creates separate input entries for services with different policy templates', () => {
    const service1 = makeService({ id: 'ec2', dataStreams: ['ec2_logs'], inputs: ['aws-s3'] });
    const service2 = makeService({ id: 'emr', dataStreams: ['emr_logs'], inputs: ['aws-s3'] });
    const inputs = buildPackageInputs(
      [service1, service2],
      {
        ec2: {
          enabledDataStreams: ['ec2_logs'],
          varsByDataStream: { ec2_logs: { enabledInputs: ['aws-s3'], varsByInput: {} } },
        },
        emr: {
          enabledDataStreams: ['emr_logs'],
          varsByDataStream: { emr_logs: { enabledInputs: ['aws-s3'], varsByInput: {} } },
        },
      },
      ''
    );
    expect(Object.keys(inputs)).toHaveLength(2);
    expect(inputs['ec2-aws-s3'].streams['aws.ec2_logs']).toBeDefined();
    expect(inputs['emr-aws-s3'].streams['aws.emr_logs']).toBeDefined();
  });

  it('falls back to first input type from service when no stored vars exist', () => {
    const service = makeService({
      id: 'ec2',
      dataStreams: ['ec2_logs'],
      inputs: ['aws-cloudwatch'],
    });
    const inputs = buildPackageInputs([service], {}, '');
    expect(inputs['ec2-aws-cloudwatch']).toBeDefined();
  });

  it('activates all inputs by default for a single-DS service with no stored enabledInputs', () => {
    // Single-DS: display defaults all inputs ON, so deploy must match.
    const service = makeService({
      id: 'cloudtrail',
      dataStreams: ['cloudtrail'],
      inputs: ['aws-s3', 'aws-cloudwatch'],
    });
    const inputs = buildPackageInputs([service], {}, '');
    expect(inputs['cloudtrail-aws-s3']).toBeDefined();
    expect(inputs['cloudtrail-aws-cloudwatch']).toBeDefined();
  });

  it('builds both inputs when two are enabled', () => {
    const service = makeService({
      id: 'guardduty',
      dataStreams: ['guardduty'],
      inputs: ['httpjson', 'aws-s3'],
    });
    const inputs = buildPackageInputs(
      [service],
      {
        guardduty: {
          enabledDataStreams: ['guardduty'],
          varsByDataStream: {
            guardduty: { enabledInputs: ['httpjson', 'aws-s3'], varsByInput: {} },
          },
        },
      },
      ''
    );
    expect(inputs['guardduty-httpjson']).toBeDefined();
    expect(inputs['guardduty-aws-s3']).toBeDefined();
  });

  it('skips services with no resolvable input type', () => {
    const service = makeService({ id: 'no_input', dataStreams: ['no_input'], inputs: [] });
    const inputs = buildPackageInputs(
      [service],
      {
        no_input: {
          enabledDataStreams: ['no_input'],
          varsByDataStream: { no_input: { enabledInputs: [], varsByInput: {} } },
        },
      },
      ''
    );
    expect(Object.keys(inputs)).toHaveLength(0);
  });

  it('keys stream as packageName.dataStreamPath and passes through stored var values', () => {
    // Verifies the exact key shapes the Fleet API expects:
    //   input key = <serviceId>-<inputType>   (e.g. elb-aws-s3)
    //   stream key = <packageName>.<dsPath>   (e.g. aws.elb_logs)
    // Also verifies that a stored var value (bucket_arn) is emitted in the stream vars.
    const service = makeService({
      id: 'elb',
      packageName: 'aws',
      dataStreams: ['elb_logs'],
      inputs: ['aws-s3', 'aws-cloudwatch'],
      requiredConfig: [],
      optionalConfig: [],
    });
    const inputs = buildPackageInputs(
      [service],
      {
        elb: {
          enabledDataStreams: ['elb_logs'],
          varsByDataStream: {
            elb_logs: {
              enabledInputs: ['aws-s3'],
              varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::test-bucket' } },
            },
          },
        },
      },
      'us-east-1'
    );

    expect(inputs['elb-aws-s3']).toBeDefined();
    expect(inputs['elb-aws-s3'].enabled).toBe(true);
    expect(inputs['elb-aws-s3'].streams['aws.elb_logs']).toBeDefined();
    expect(inputs['elb-aws-s3'].streams['aws.elb_logs'].enabled).toBe(true);
    expect(inputs['elb-aws-s3'].streams['aws.elb_logs'].vars.bucket_arn).toBe(
      'arn:aws:s3:::test-bucket'
    );
    // aws-cloudwatch was not in enabledInputs — not included by buildPackageInputs.
    // (deployGroup adds it as enabled:false via the pkgTemplates explicit-disable loop.)
    expect(inputs['elb-aws-cloudwatch']).toBeUndefined();
  });

  it('omits explicitly-disabled data streams (enabledDataStreams: [] stored)', () => {
    // Verifies the "explicitly emptied vs never configured" fix: a stored empty array
    // means the user turned everything off — buildPackageInputs should emit nothing.
    const service = makeService({
      id: 'cloudtrail',
      packageName: 'aws',
      dataStreams: ['cloudtrail'],
      inputs: ['aws-s3', 'aws-cloudwatch'],
    });
    const inputs = buildPackageInputs(
      [service],
      {
        cloudtrail: {
          enabledDataStreams: [],
          varsByDataStream: { cloudtrail: { enabledInputs: [], varsByInput: {} } },
        },
      },
      ''
    );
    expect(Object.keys(inputs)).toHaveLength(0);
  });
});

// ─── collectDeployResults ────────────────────────────────────────────────────

/** Build a minimal DeployGroup for use in collectDeployResults tests. */
function makeGroup(instanceIds: string[], isDuplicateGroup = false) {
  const svc = makeService();
  return {
    groupId: isDuplicateGroup ? instanceIds[0] : svc.packageName,
    instanceIds,
    members: instanceIds.map((id) => ({
      instance: { instanceId: id, serviceId: id, name: id, isDuplicate: isDuplicateGroup },
      service: svc,
    })),
    isDuplicateGroup,
  };
}

describe('collectDeployResults', () => {
  it('extracts policyId from fulfilled result', () => {
    const results = [{ status: 'fulfilled' as const, value: { policyId: 'policy-abc' } }];
    const { policyIdsByInstance, failedInstances, errorsByInstance } = collectDeployResults(
      results,
      [makeGroup(['inst-1'])]
    );
    expect(policyIdsByInstance['inst-1']).toBe('policy-abc');
    expect(failedInstances).toHaveLength(0);
    expect(errorsByInstance).not.toHaveProperty('inst-1');
  });

  it('omits policyId when response does not include one', () => {
    const results = [{ status: 'fulfilled' as const, value: {} }];
    const { policyIdsByInstance, failedInstances, errorsByInstance } = collectDeployResults(
      results,
      [makeGroup(['inst-1'])]
    );
    expect(policyIdsByInstance).not.toHaveProperty('inst-1');
    expect(failedInstances).toHaveLength(0);
    expect(errorsByInstance).not.toHaveProperty('inst-1');
  });

  it('adds instance to failedInstances on rejection and captures error message', () => {
    const results = [{ status: 'rejected' as const, reason: new Error('Network failure') }];
    const { policyIdsByInstance, failedInstances, errorsByInstance } = collectDeployResults(
      results,
      [makeGroup(['inst-1'])]
    );
    expect(failedInstances).toContain('inst-1');
    expect(policyIdsByInstance).not.toHaveProperty('inst-1');
    expect(errorsByInstance['inst-1']).toBe('Network failure');
  });

  it('captures error message from plain object rejection', () => {
    const results = [{ status: 'rejected' as const, reason: { message: 'Server error' } }];
    const { errorsByInstance } = collectDeployResults(results, [makeGroup(['inst-1'])]);
    expect(errorsByInstance['inst-1']).toBe('Server error');
  });

  it('handles mixed fulfilled and rejected results', () => {
    const results = [
      { status: 'fulfilled' as const, value: { policyId: 'p1' } },
      { status: 'rejected' as const, reason: new Error('fail') },
    ];
    const { policyIdsByInstance, failedInstances, errorsByInstance } = collectDeployResults(
      results,
      [makeGroup(['inst-a']), makeGroup(['inst-b'])]
    );
    expect(policyIdsByInstance['inst-a']).toBe('p1');
    expect(failedInstances).toContain('inst-b');
    expect(errorsByInstance['inst-b']).toBe('fail');
    expect(errorsByInstance).not.toHaveProperty('inst-a');
  });

  it('fans a bundled group policyId out to all instance ids in the group', () => {
    const results = [{ status: 'fulfilled' as const, value: { policyId: 'shared-policy' } }];
    const { policyIdsByInstance, failedInstances } = collectDeployResults(results, [
      makeGroup(['inst-a', 'inst-b', 'inst-c']),
    ]);
    expect(policyIdsByInstance['inst-a']).toBe('shared-policy');
    expect(policyIdsByInstance['inst-b']).toBe('shared-policy');
    expect(policyIdsByInstance['inst-c']).toBe('shared-policy');
    expect(failedInstances).toHaveLength(0);
  });

  it('marks all bundled group instance ids as failed when the call is rejected', () => {
    const results = [{ status: 'rejected' as const, reason: new Error('Bundle failed') }];
    const { failedInstances, errorsByInstance } = collectDeployResults(results, [
      makeGroup(['inst-a', 'inst-b']),
    ]);
    expect(failedInstances).toContain('inst-a');
    expect(failedInstances).toContain('inst-b');
    expect(errorsByInstance['inst-a']).toBe('Bundle failed');
    expect(errorsByInstance['inst-b']).toBe('Bundle failed');
  });
});

// ─── buildInstanceStatuses ───────────────────────────────────────────────────

describe('buildInstanceStatuses', () => {
  it('sets succeeded instance ids to "instantiating" by default', () => {
    const statuses = buildInstanceStatuses(['inst-a', 'inst-b'], []);
    expect(statuses['inst-a']).toBe('instantiating');
    expect(statuses['inst-b']).toBe('instantiating');
  });

  it('sets succeeded instance ids to the provided succeededState', () => {
    const statuses = buildInstanceStatuses(['inst-a'], [], 'detecting');
    expect(statuses['inst-a']).toBe('detecting');
  });

  it('sets failed instance ids to "error"', () => {
    const statuses = buildInstanceStatuses(['inst-a', 'inst-b'], ['inst-a', 'inst-b']);
    expect(statuses['inst-a']).toBe('error');
    expect(statuses['inst-b']).toBe('error');
  });

  it('handles mixed succeeded and failed instances', () => {
    const statuses = buildInstanceStatuses(['inst-a', 'inst-b'], ['inst-b']);
    expect(statuses['inst-a']).toBe('instantiating');
    expect(statuses['inst-b']).toBe('error');
  });

  it('returns empty object when targets is empty', () => {
    const statuses = buildInstanceStatuses([], []);
    expect(statuses).toEqual({});
  });
});

// ─── useDeploy hook ──────────────────────────────────────────────────────────

function setupMocks({
  selectedServiceIds = ['ec2'],
  connectorId = undefined as string | undefined,
  staticKeys = undefined as { access_key_id: string; secret_access_key: string } | undefined,
  globalRegion = 'us-east-1',
  pkgVersion = '2.0.0',
  detectAndReviewStep = {} as Record<string, unknown>,
  instances = undefined as
    | Array<{ instanceId: string; serviceId: string; name: string; isDuplicate: boolean }>
    | undefined,
}: {
  selectedServiceIds?: string[];
  connectorId?: string;
  staticKeys?: { access_key_id: string; secret_access_key: string };
  globalRegion?: string;
  pkgVersion?: string;
  detectAndReviewStep?: Record<string, unknown>;
  instances?: Array<{ instanceId: string; serviceId: string; name: string; isDuplicate: boolean }>;
} = {}) {
  mockUseOnboardingFlow.mockReturnValue({
    servicesStep: { selectedServiceIds },
    authenticateAndDeployStep: { connectorId, staticKeys },
    detectAndReviewStep: {
      isDeploying: false,
      serviceStatuses: {},
      policyIdsByInstance: {},
      failedInstances: [],
      ...detectAndReviewStep,
    },
    awsServicesMap: (useAwsServicesMap as jest.Mock)(),
    updateDetectAndReviewStep: jest.fn(),
    getLatestFailedInstances: jest.fn().mockReturnValue([]),
  });

  mockUseSessionStorage.mockReturnValue([{ globalRegion, serviceVars: {}, instances }, jest.fn()]);

  mockSendGetPackageInfoByKey.mockResolvedValue({
    data: {
      item: {
        version: pkgVersion,
        vars: [
          { name: 'default_region' },
          { name: 'access_key_id' },
          { name: 'secret_access_key' },
        ],
      },
    },
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
    expect(result.current.failedInstances).toEqual([]);
  });

  it('initializes failedInstances from persisted detectAndReviewStep state (survives remount)', () => {
    // Simulate the post-Back/Next remount: session storage still has a failure from a prior deploy,
    // but deployAttempted and local failedInstances are both reset to their initial values.
    // The hook must seed from the persisted store so the error callout remains visible.
    setupMocks({
      selectedServiceIds: ['ec2'],
      detectAndReviewStep: {
        serviceStatuses: { ec2: 'error' },
        failedInstances: ['ec2'],
      },
    });
    const { result } = renderHook(() => useDeploy({ onContinue: jest.fn() }));

    expect(result.current.failedInstances).toEqual(['ec2']);
  });

  it('navigates immediately and completes API call on success', async () => {
    setupMocks({ selectedServiceIds: ['ec2'] });
    const onContinue = jest.fn();
    const { result } = renderHook(() => useDeploy({ onContinue }));

    await act(async () => {
      await result.current.handleDeploy();
    });

    expect(mockSendCreateAgentlessPolicy).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('navigates immediately even when deployment fails', async () => {
    setupMocks({ selectedServiceIds: ['ec2'] });
    mockSendCreateAgentlessPolicy.mockRejectedValue(new Error('API error'));
    const onContinue = jest.fn();
    const { result } = renderHook(() => useDeploy({ onContinue }));

    await act(async () => {
      await result.current.handleDeploy();
    });

    expect(result.current.failedInstances).toContain('ec2');
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

  it('retries only the specified failed instances without navigating again', async () => {
    setupMocks({ selectedServiceIds: ['ec2'] });
    mockSendCreateAgentlessPolicy
      .mockRejectedValueOnce(new Error('first fail'))
      .mockResolvedValueOnce({ data: {} });
    const onContinue = jest.fn();
    const { result } = renderHook(() => useDeploy({ onContinue }));

    await act(async () => {
      await result.current.handleDeploy();
    });
    expect(result.current.failedInstances).toContain('ec2');
    expect(onContinue).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.handleDeploy(['ec2']);
    });
    expect(result.current.failedInstances).toHaveLength(0);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('passes cloud_connector when connectorId is set (identity federation path)', async () => {
    setupMocks({ selectedServiceIds: ['ec2'], connectorId: 'connector-123' });
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
      selectedServiceIds: ['ec2'],
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

  it('calls onContinue immediately when no managed_integration services are selected', async () => {
    setupMocks({ selectedServiceIds: [] });
    const onContinue = jest.fn();
    const { result } = renderHook(() => useDeploy({ onContinue }));

    await act(async () => {
      await result.current.handleDeploy();
    });

    expect(mockSendCreateAgentlessPolicy).not.toHaveBeenCalled();
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('adds to failedInstances when package version cannot be resolved', async () => {
    setupMocks({ selectedServiceIds: ['ec2'] });
    mockSendGetPackageInfoByKey.mockResolvedValue({ data: { item: { version: undefined } } });
    const { result } = renderHook(() => useDeploy({ onContinue: jest.fn() }));

    await act(async () => {
      await result.current.handleDeploy();
    });

    expect(result.current.failedInstances).toContain('ec2');
  });

  it('navigates without resubmitting when all selected instances are already deployed', async () => {
    setupMocks({
      selectedServiceIds: ['ec2'],
      detectAndReviewStep: { serviceStatuses: { ec2: 'detecting' } },
    });
    const onContinue = jest.fn();
    const { result } = renderHook(() => useDeploy({ onContinue }));

    await act(async () => {
      await result.current.handleDeploy();
    });

    expect(mockSendCreateAgentlessPolicy).not.toHaveBeenCalled();
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('navigates without resubmitting when deploy is in progress for all selected instances', async () => {
    setupMocks({
      selectedServiceIds: ['ec2'],
      detectAndReviewStep: { isDeploying: true, serviceStatuses: { ec2: 'instantiating' } },
    });
    const onContinue = jest.fn();
    const { result } = renderHook(() => useDeploy({ onContinue }));

    await act(async () => {
      await result.current.handleDeploy();
    });

    expect(mockSendCreateAgentlessPolicy).not.toHaveBeenCalled();
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('deploys only untracked instances — does not redeploy already-running ones', async () => {
    // ec2 is already deployed; lambda is a new selection.
    // Both are in the 'aws' package and are normally bundled, but the bundle must be
    // trimmed to only the untracked member (lambda) — ec2 must not be re-included.
    setupMocks({
      selectedServiceIds: ['ec2', 'lambda'],
      detectAndReviewStep: { serviceStatuses: { ec2: 'instantiating' } },
    });
    const onContinue = jest.fn();
    const { result } = renderHook(() => useDeploy({ onContinue }));

    await act(async () => {
      await result.current.handleDeploy();
    });

    // One API call for the trimmed bundle (lambda only)
    expect(mockSendCreateAgentlessPolicy).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledTimes(1);
    // The already-running ec2 must not appear enabled in the new call.
    const submittedInputs = mockSendCreateAgentlessPolicy.mock.calls[0][0].inputs;
    expect(submittedInputs['ec2-aws-s3']?.enabled).not.toBe(true);
    expect(submittedInputs['lambda-aws/metrics'].enabled).toBe(true);
  });

  it('deploys duplicate instances as separate managed_integration policy calls', async () => {
    // Original goes into a bundled group (1 call); duplicate gets its own call (1 call).
    // Total: 2 sendCreateAgentlessPolicy calls.
    const instances = [
      {
        instanceId: 'ec2',
        serviceId: 'ec2',
        name: 'Amazon EC2',
        isDuplicate: false,
      },
      {
        instanceId: 'ec2__dup-1',
        serviceId: 'ec2',
        name: 'Amazon EC2 [Duplicate]',
        isDuplicate: true,
      },
    ];
    setupMocks({
      selectedServiceIds: ['ec2'],
      instances,
    });
    const { result } = renderHook(() => useDeploy({ onContinue: jest.fn() }));

    await act(async () => {
      await result.current.handleDeploy();
    });

    // One API call per instance
    expect(mockSendCreateAgentlessPolicy).toHaveBeenCalledTimes(2);
  });

  it('does not redeploy an already-running duplicate on a second Deploy click', async () => {
    // Simulates navigating back to step 3 after a duplicate was already deployed.
    // The duplicate's instanceId is already in serviceStatuses — it must not get a second policy.
    const instances = [
      {
        instanceId: 'ec2',
        serviceId: 'ec2',
        name: 'Amazon EC2',
        isDuplicate: false,
      },
      {
        instanceId: 'ec2__dup-1',
        serviceId: 'ec2',
        name: 'Amazon EC2 [Duplicate]',
        isDuplicate: true,
      },
    ];
    setupMocks({
      selectedServiceIds: ['ec2'],
      instances,
      detectAndReviewStep: {
        serviceStatuses: {
          ec2: 'detecting',
          'ec2__dup-1': 'detecting',
        },
      },
    });
    const onContinue = jest.fn();
    const { result } = renderHook(() => useDeploy({ onContinue }));

    await act(async () => {
      await result.current.handleDeploy();
    });

    // Both already deployed — no new API calls, just navigate.
    expect(mockSendCreateAgentlessPolicy).not.toHaveBeenCalled();
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('deploys a newly-selected service even when persisted instances do not include it', async () => {
    // Regression: user selects cloudtrail, configures it (persists instances = ['cloudtrail']),
    // goes back to step 1, also selects ec2 (no config required), then deploys.
    // buildDeployGroups must reconcile the stale persisted list against selectedServiceIds so
    // ec2 is not silently dropped.
    const instances = [
      {
        instanceId: 'cloudtrail',
        serviceId: 'cloudtrail',
        name: 'AWS CloudTrail',
        isDuplicate: false,
      },
    ];
    setupMocks({
      selectedServiceIds: ['cloudtrail', 'ec2'],
      instances,
    });
    const { result } = renderHook(() => useDeploy({ onContinue: jest.fn() }));

    await act(async () => {
      await result.current.handleDeploy();
    });

    // ec2 is managed_integration; cloudtrail is ecf. One bundled call for ec2.
    expect(mockSendCreateAgentlessPolicy).toHaveBeenCalledTimes(1);
    const submittedInputs = mockSendCreateAgentlessPolicy.mock.calls[0][0].inputs;
    // ec2 must appear in the call — it must not be silently dropped.
    expect(submittedInputs['ec2-aws-s3'].enabled).toBe(true);
  });

  it('does not deploy a deselected service even when it is still in persisted instances', async () => {
    // Regression variant: user had cloudtrail selected (persisted), deselects it, selects only
    // ec2. buildDeployGroups must drop cloudtrail from the resolved list.
    const instances = [
      {
        instanceId: 'cloudtrail',
        serviceId: 'cloudtrail',
        name: 'AWS CloudTrail',
        isDuplicate: false,
      },
    ];
    setupMocks({
      selectedServiceIds: ['ec2'],
      instances,
    });
    const { result } = renderHook(() => useDeploy({ onContinue: jest.fn() }));

    await act(async () => {
      await result.current.handleDeploy();
    });

    // One call — only ec2; cloudtrail must not appear.
    expect(mockSendCreateAgentlessPolicy).toHaveBeenCalledTimes(1);
    const submittedInputs = mockSendCreateAgentlessPolicy.mock.calls[0][0].inputs;
    expect(submittedInputs['ec2-aws-s3'].enabled).toBe(true);
    // cloudtrail input must not be included (if it were, it would appear as 'cloudtrail-aws-s3'
    // or similar and would fire a separate call or appear enabled in the single call).
    const hasCloudtrailInput = Object.keys(submittedInputs).some((k) => k.startsWith('cloudtrail'));
    expect(hasCloudtrailInput).toBe(false);
  });

  describe('isAlreadyDeployed', () => {
    it('is false when serviceStatuses is empty', () => {
      setupMocks({
        selectedServiceIds: ['ec2'],
        detectAndReviewStep: { serviceStatuses: {} },
      });
      const { result } = renderHook(() => useDeploy({ onContinue: jest.fn() }));
      expect(result.current.isAlreadyDeployed).toBe(false);
    });

    it('is false when status is instantiating (deploy in flight)', () => {
      setupMocks({
        selectedServiceIds: ['ec2'],
        detectAndReviewStep: { serviceStatuses: { ec2: 'instantiating' } },
      });
      const { result } = renderHook(() => useDeploy({ onContinue: jest.fn() }));
      expect(result.current.isAlreadyDeployed).toBe(false);
    });

    it('is false when status is error', () => {
      setupMocks({
        selectedServiceIds: ['ec2'],
        detectAndReviewStep: { serviceStatuses: { ec2: 'error' } },
      });
      const { result } = renderHook(() => useDeploy({ onContinue: jest.fn() }));
      expect(result.current.isAlreadyDeployed).toBe(false);
    });

    it('is true when all members have status receiving', () => {
      setupMocks({
        selectedServiceIds: ['ec2'],
        detectAndReviewStep: { serviceStatuses: { ec2: 'receiving' } },
      });
      const { result } = renderHook(() => useDeploy({ onContinue: jest.fn() }));
      expect(result.current.isAlreadyDeployed).toBe(true);
    });

    it('is true when all members have status detecting', () => {
      setupMocks({
        selectedServiceIds: ['ec2'],
        detectAndReviewStep: { serviceStatuses: { ec2: 'detecting' } },
      });
      const { result } = renderHook(() => useDeploy({ onContinue: jest.fn() }));
      expect(result.current.isAlreadyDeployed).toBe(true);
    });

    it('is true when all members have status timeout — a timed-out deploy must not un-complete step 3', () => {
      setupMocks({
        selectedServiceIds: ['ec2'],
        detectAndReviewStep: { serviceStatuses: { ec2: 'timeout' } },
      });
      const { result } = renderHook(() => useDeploy({ onContinue: jest.fn() }));
      expect(result.current.isAlreadyDeployed).toBe(true);
    });

    it('is true with a mixed set — one receiving, one detecting (the state during incremental polling promotion)', () => {
      setupMocks({
        selectedServiceIds: ['ec2', 'guardduty'],
        detectAndReviewStep: { serviceStatuses: { ec2: 'receiving', guardduty: 'detecting' } },
      });
      const { result } = renderHook(() => useDeploy({ onContinue: jest.fn() }));
      expect(result.current.isAlreadyDeployed).toBe(true);
    });

    it('is false with a mixed set — one detecting, one instantiating (deploy still in progress)', () => {
      setupMocks({
        selectedServiceIds: ['ec2', 'guardduty'],
        detectAndReviewStep: { serviceStatuses: { ec2: 'detecting', guardduty: 'instantiating' } },
      });
      const { result } = renderHook(() => useDeploy({ onContinue: jest.fn() }));
      expect(result.current.isAlreadyDeployed).toBe(false);
    });
  });

  it('includes non-managed_integration services as gray instantiating chips without deploying them', async () => {
    // ec2 is managed_integration; cloudtrail is ecf
    setupMocks({ selectedServiceIds: ['ec2', 'cloudtrail'] });
    const onContinue = jest.fn();
    const { result } = renderHook(() => useDeploy({ onContinue }));

    await act(async () => {
      await result.current.handleDeploy();
    });

    const updateDetectAndReviewStep = mockUseOnboardingFlow.mock.results[0].value
      .updateDetectAndReviewStep as jest.Mock;
    const initialUpdate = updateDetectAndReviewStep.mock.calls[0][0];

    // Both services appear in the initial status update
    expect(initialUpdate.serviceStatuses.ec2).toBe('instantiating');
    expect(initialUpdate.serviceStatuses.cloudtrail).toBe('instantiating');
    // Managed integrations API called once (for ec2; cloudtrail is ecf, non-managed)
    expect(mockSendCreateAgentlessPolicy).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});

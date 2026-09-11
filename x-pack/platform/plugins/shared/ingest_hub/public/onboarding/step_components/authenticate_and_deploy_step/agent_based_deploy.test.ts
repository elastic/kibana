/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryVarsEntry } from '@kbn/fleet-plugin/common';

// Bare factory (not requireActual) — the Fleet barrel is heavy and we only need these senders.
jest.mock('@kbn/fleet-plugin/public', () => ({
  sendCreateAgentPolicyWithPackagePolicies: jest.fn(),
  sendCreatePackagePolicy: jest.fn(),
  sendGetPackageInfoByKeyForRq: jest.fn(),
}));

import {
  sendCreateAgentPolicyWithPackagePolicies,
  sendCreatePackagePolicy,
  sendGetPackageInfoByKeyForRq,
} from '@kbn/fleet-plugin/public';
import {
  buildAgentBasedTargets,
  deployNewAgentPolicy,
  deployToExistingAgentPolicies,
  extractErrorMessage,
} from './agent_based_deploy';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { ServiceInstance } from '../service_settings_step/use_service_settings';

const mockSendCreateAgentPolicy = sendCreateAgentPolicyWithPackagePolicies as jest.Mock;
const mockSendCreatePackagePolicy = sendCreatePackagePolicy as jest.Mock;
const mockSendGetPackageInfo = sendGetPackageInfoByKeyForRq as jest.Mock;

function makeVarDef(name: string, opts: Partial<RegistryVarsEntry> = {}): RegistryVarsEntry {
  return { name, type: 'text', title: name, ...opts } as RegistryVarsEntry;
}

/** A var the step-2 form prompts for: required AND show_user. */
function makeRequiredUserVar(name: string): RegistryVarsEntry {
  return makeVarDef(name, { required: true, show_user: true });
}

/**
 * GuardDuty-shaped service: one data stream, two inputs. `httpjson` declares two required vars;
 * `aws-s3` declares none. This is the shape that produced the reported failure.
 */
function makeGuardDutyService(): AwsServiceMatrixEntry {
  return {
    id: 'guardduty',
    name: 'AWS GuardDuty',
    packageName: 'aws',
    dataStreams: ['guardduty'],
    inputs: ['aws-s3', 'httpjson'],
    showInUI: true,
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    varDefsByInput: {
      httpjson: {
        detector_id: makeRequiredUserVar('detector_id'),
        aws_region: makeRequiredUserVar('aws_region'),
      },
      'aws-s3': {
        bucket_arn: makeVarDef('bucket_arn'),
      },
    },
    varDefsByDataStream: {
      guardduty: {
        inputs: ['aws-s3', 'httpjson'],
        varDefsByInput: {
          httpjson: {
            detector_id: makeRequiredUserVar('detector_id'),
            aws_region: makeRequiredUserVar('aws_region'),
          },
          'aws-s3': {
            bucket_arn: makeVarDef('bucket_arn'),
          },
        },
      },
    },
  } as unknown as AwsServiceMatrixEntry;
}

/** Single-input service with no required vars — always deployable. */
function makeSimpleService(id = 'vpcflow'): AwsServiceMatrixEntry {
  return {
    id,
    name: `AWS ${id}`,
    packageName: 'aws',
    dataStreams: [id],
    inputs: ['aws-s3'],
    showInUI: true,
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    varDefsByInput: { 'aws-s3': { bucket_arn: makeVarDef('bucket_arn') } },
    varDefsByDataStream: {
      [id]: {
        inputs: ['aws-s3'],
        varDefsByInput: { 'aws-s3': { bucket_arn: makeVarDef('bucket_arn') } },
      },
    },
  } as unknown as AwsServiceMatrixEntry;
}

function makeInstance(overrides: Partial<ServiceInstance> = {}): ServiceInstance {
  return {
    instanceId: 'vpcflow',
    serviceId: 'vpcflow',
    name: 'AWS vpcflow',
    isDuplicate: false,
    ...overrides,
  };
}

const BASE_OPTS = {
  namespace: 'default',
  globalRegion: 'us-east-1',
  storedServiceVars: {},
  authenticateAndDeployStep: {},
  pkgVersion: '',
};

beforeEach(() => {
  jest.clearAllMocks();
  // sendGetPackageInfoByKeyForRq uses sendRequestForRq — returns unwrapped { item } directly, no envelope.
  mockSendGetPackageInfo.mockResolvedValue({ item: { version: '3.0.0', vars: [] } });
  mockSendCreateAgentPolicy.mockResolvedValue({
    item: { id: 'agent-policy-1', package_policies: [] },
  });
  mockSendCreatePackagePolicy.mockResolvedValue({ item: { id: 'pp-1' } });
});

describe('buildAgentBasedTargets', () => {
  it('keeps persisted instances whose service is still selected', () => {
    const svc = makeSimpleService();
    const targets = buildAgentBasedTargets(
      [makeInstance()],
      ['vpcflow'],
      new Map([['vpcflow', svc]])
    );
    expect(targets).toHaveLength(1);
    expect(targets[0].instance.instanceId).toBe('vpcflow');
  });

  it('drops persisted instances whose service was deselected in step 1', () => {
    const svc = makeSimpleService();
    const targets = buildAgentBasedTargets(
      [makeInstance(), makeInstance({ instanceId: 'guardduty', serviceId: 'guardduty' })],
      ['vpcflow'],
      new Map([['vpcflow', svc]])
    );
    expect(targets.map((t) => t.instance.serviceId)).toEqual(['vpcflow']);
  });

  it('adds a base instance for a selected service with no persisted instance', () => {
    const svc = makeSimpleService();
    const targets = buildAgentBasedTargets([], ['vpcflow'], new Map([['vpcflow', svc]]));
    expect(targets).toHaveLength(1);
    expect(targets[0].instance.instanceId).toBe('vpcflow');
  });

  it('keeps duplicates as peers of their original', () => {
    const svc = makeSimpleService();
    const targets = buildAgentBasedTargets(
      [
        makeInstance(),
        makeInstance({ instanceId: 'vpcflow__dup-1', name: 'Second bucket', isDuplicate: true }),
      ],
      ['vpcflow'],
      new Map([['vpcflow', svc]])
    );
    expect(targets.map((t) => t.instance.instanceId)).toEqual(['vpcflow', 'vpcflow__dup-1']);
  });
});

describe('deployNewAgentPolicy', () => {
  it('sends one request with one package policy per target', async () => {
    const svc = makeSimpleService();
    const targets = buildAgentBasedTargets([], ['vpcflow'], new Map([['vpcflow', svc]]));

    await deployNewAgentPolicy(targets, { ...BASE_OPTS, agentPolicyName: 'AWS Onboarding' });

    expect(mockSendCreateAgentPolicy).toHaveBeenCalledTimes(1);
    const body = mockSendCreateAgentPolicy.mock.calls[0][0];
    expect(body.package_policies).toHaveLength(1);
  });

  it('puts namespace on the agent policy and omits it per package policy', async () => {
    const svc = makeSimpleService();
    const targets = buildAgentBasedTargets([], ['vpcflow'], new Map([['vpcflow', svc]]));

    await deployNewAgentPolicy(targets, {
      ...BASE_OPTS,
      namespace: 'custom-ns',
      agentPolicyName: 'AWS Onboarding',
    });

    const body = mockSendCreateAgentPolicy.mock.calls[0][0];
    expect(body.namespace).toBe('custom-ns');
    expect(body.package_policies[0].namespace).toBeUndefined();
  });

  it('never sends cloud_connector — that is an agentless-only auth mechanism', async () => {
    const svc = makeSimpleService();
    const targets = buildAgentBasedTargets([], ['vpcflow'], new Map([['vpcflow', svc]]));

    await deployNewAgentPolicy(targets, {
      ...BASE_OPTS,
      authenticateAndDeployStep: { connectorId: 'connector-1' } as never,
      agentPolicyName: 'AWS Onboarding',
    });

    const serialized = JSON.stringify(mockSendCreateAgentPolicy.mock.calls[0][0]);
    expect(serialized).not.toContain('cloud_connector');
    expect(serialized).not.toContain('connector-1');
  });

  it('maps returned package policy ids back by name, not array index', async () => {
    const svc = makeSimpleService();
    const targets = buildAgentBasedTargets(
      [
        makeInstance(),
        makeInstance({ instanceId: 'vpcflow__dup-1', name: 'Second bucket', isDuplicate: true }),
      ],
      ['vpcflow'],
      new Map([['vpcflow', svc]])
    );

    // Capture the names we sent, then reply with them in REVERSED order. Index alignment would
    // swap the two ids; keying by name must not.
    let sentNames: string[] = [];
    mockSendCreateAgentPolicy.mockImplementation(async (body: any) => {
      sentNames = body.package_policies.map((pp: any) => pp.name);
      return {
        item: {
          id: 'agent-policy-1',
          package_policies: [
            { id: 'pp-second', name: sentNames[1] },
            { id: 'pp-first', name: sentNames[0] },
          ],
        },
      };
    });

    const result = await deployNewAgentPolicy(targets, {
      ...BASE_OPTS,
      agentPolicyName: 'AWS Onboarding',
    });

    expect(result.packagePolicyIdsByInstance.vpcflow).toBe('pp-first');
    expect(result.packagePolicyIdsByInstance['vpcflow__dup-1']).toBe('pp-second');
  });

  it('gives duplicate instances distinct bucket_arns in separate documents', async () => {
    const svc = makeSimpleService();
    const targets = buildAgentBasedTargets(
      [
        makeInstance(),
        makeInstance({ instanceId: 'vpcflow__dup-1', name: 'Second bucket', isDuplicate: true }),
      ],
      ['vpcflow'],
      new Map([['vpcflow', svc]])
    );

    await deployNewAgentPolicy(targets, {
      ...BASE_OPTS,
      storedServiceVars: {
        vpcflow: {
          enabledDataStreams: ['vpcflow'],
          varsByDataStream: {
            vpcflow: {
              enabledInputs: ['aws-s3'],
              varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::bucket-one' } },
            },
          },
        },
        'vpcflow__dup-1': {
          enabledDataStreams: ['vpcflow'],
          varsByDataStream: {
            vpcflow: {
              enabledInputs: ['aws-s3'],
              varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::bucket-two' } },
            },
          },
        },
      } as never,
      agentPolicyName: 'AWS Onboarding',
    });

    const body = mockSendCreateAgentPolicy.mock.calls[0][0];
    expect(body.package_policies).toHaveLength(2);
    // bucket_arn is a multi var (an ECF trigger var), so toTyped yields string[].
    const arns = body.package_policies.map(
      (pp: any) => pp.inputs['vpcflow-aws-s3'].streams['aws.vpcflow'].vars.bucket_arn
    );
    expect(arns).toEqual([['arn:aws:s3:::bucket-one'], ['arn:aws:s3:::bucket-two']]);
    // The point of the test: the two documents carry different ARNs.
    expect(arns[0]).not.toEqual(arns[1]);
  });

  describe('unsatisfied-input pruning', () => {
    // Regression: buildPackageInputs defaults a single-data-stream service to ALL of its inputs,
    // so an input the user never configured in step 2 was emitted with empty vars and Fleet
    // rejected the whole policy with e.g.
    //   inputs.guardduty-httpjson.streams.aws.guardduty.vars.detector_id: ["Detector ID is required"]
    it('drops an input whose required vars are unset', async () => {
      const svc = makeGuardDutyService();
      const targets = buildAgentBasedTargets([], ['guardduty'], new Map([['guardduty', svc]]));

      await deployNewAgentPolicy(targets, {
        ...BASE_OPTS,
        storedServiceVars: {
          guardduty: {
            enabledDataStreams: ['guardduty'],
            varsByDataStream: {
              guardduty: {
                enabledInputs: [],
                varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::gd' } },
              },
            },
          },
        } as never,
        agentPolicyName: 'AWS Onboarding',
      });

      const inputs = mockSendCreateAgentPolicy.mock.calls[0][0].package_policies[0].inputs;
      expect(inputs['guardduty-httpjson']).toBeUndefined();
      expect(inputs['guardduty-aws-s3']).toBeDefined();
    });

    it('keeps an input whose required vars are all satisfied', async () => {
      const svc = makeGuardDutyService();
      const targets = buildAgentBasedTargets([], ['guardduty'], new Map([['guardduty', svc]]));

      await deployNewAgentPolicy(targets, {
        ...BASE_OPTS,
        storedServiceVars: {
          guardduty: {
            enabledDataStreams: ['guardduty'],
            varsByDataStream: {
              guardduty: {
                enabledInputs: ['httpjson'],
                varsByInput: {
                  httpjson: { detector_id: 'abc123', aws_region: 'us-east-1' },
                },
              },
            },
          },
        } as never,
        agentPolicyName: 'AWS Onboarding',
      });

      const inputs = mockSendCreateAgentPolicy.mock.calls[0][0].package_policies[0].inputs;
      expect(inputs['guardduty-httpjson']).toBeDefined();
      expect(inputs['guardduty-httpjson'].streams['aws.guardduty'].vars.detector_id).toBe('abc123');
    });

    it('treats a whitespace-only required var as unsatisfied', async () => {
      const svc = makeGuardDutyService();
      const targets = buildAgentBasedTargets([], ['guardduty'], new Map([['guardduty', svc]]));

      await deployNewAgentPolicy(targets, {
        ...BASE_OPTS,
        storedServiceVars: {
          guardduty: {
            enabledDataStreams: ['guardduty'],
            varsByDataStream: {
              guardduty: {
                enabledInputs: ['httpjson', 'aws-s3'],
                varsByInput: {
                  httpjson: { detector_id: '   ', aws_region: 'us-east-1' },
                  'aws-s3': { bucket_arn: 'arn:aws:s3:::gd' },
                },
              },
            },
          },
        } as never,
        agentPolicyName: 'AWS Onboarding',
      });

      const inputs = mockSendCreateAgentPolicy.mock.calls[0][0].package_policies[0].inputs;
      expect(inputs['guardduty-httpjson']).toBeUndefined();
    });

    // Regression: the prune bar was stricter than step 2's, so a service step 2 showed as fully
    // configured failed with "No fully configured input for AWS Config". Step 2 only prompts for
    // required vars that are show_user, non-bool, and not region fields (getRequiredTextFields);
    // anything else is advanced/defaulted and must not block the deploy.
    it('keeps an input whose required var is not show_user — step 2 never prompts for it', async () => {
      const svc = makeSimpleService('config');
      (svc as any).varDefsByInput['aws-s3'].advanced_thing = makeVarDef('advanced_thing', {
        required: true,
        show_user: false,
      });
      (svc as any).varDefsByDataStream.config.varDefsByInput['aws-s3'].advanced_thing = makeVarDef(
        'advanced_thing',
        { required: true, show_user: false }
      );
      const targets = buildAgentBasedTargets([], ['config'], new Map([['config', svc]]));

      await deployNewAgentPolicy(targets, { ...BASE_OPTS, agentPolicyName: 'AWS Onboarding' });

      const inputs = mockSendCreateAgentPolicy.mock.calls[0][0].package_policies[0].inputs;
      expect(inputs['config-aws-s3']).toBeDefined();
    });

    it('keeps an input whose only required var is a region field', async () => {
      // Region comes from step 2's global picker, not a per-input field, and buildStreamVars
      // backfills it — so a required aws_region must never block the deploy.
      const svc = makeSimpleService('config');
      (svc as any).varDefsByInput['aws-s3'].aws_region = makeRequiredUserVar('aws_region');
      (svc as any).varDefsByDataStream.config.varDefsByInput['aws-s3'].aws_region =
        makeRequiredUserVar('aws_region');
      const targets = buildAgentBasedTargets([], ['config'], new Map([['config', svc]]));

      await deployNewAgentPolicy(targets, { ...BASE_OPTS, agentPolicyName: 'AWS Onboarding' });

      const inputs = mockSendCreateAgentPolicy.mock.calls[0][0].package_policies[0].inputs;
      expect(inputs['config-aws-s3']).toBeDefined();
    });

    it('keeps an input whose only required var is a bool', async () => {
      const svc = makeSimpleService('config');
      const boolVar = makeVarDef('enable_thing', {
        required: true,
        show_user: true,
        type: 'bool',
      });
      (svc as any).varDefsByInput['aws-s3'].enable_thing = boolVar;
      (svc as any).varDefsByDataStream.config.varDefsByInput['aws-s3'].enable_thing = boolVar;
      const targets = buildAgentBasedTargets([], ['config'], new Map([['config', svc]]));

      await deployNewAgentPolicy(targets, { ...BASE_OPTS, agentPolicyName: 'AWS Onboarding' });

      const inputs = mockSendCreateAgentPolicy.mock.calls[0][0].package_policies[0].inputs;
      expect(inputs['config-aws-s3']).toBeDefined();
    });

    it('names the missing fields in the error rather than blaming step 2 generically', async () => {
      const svc = makeGuardDutyService();
      (svc as any).inputs = ['httpjson'];
      (svc as any).varDefsByDataStream.guardduty.inputs = ['httpjson'];
      const targets = buildAgentBasedTargets([], ['guardduty'], new Map([['guardduty', svc]]));

      await expect(
        deployNewAgentPolicy(targets, { ...BASE_OPTS, globalRegion: '', agentPolicyName: 'X' })
      ).rejects.toThrow(/httpjson: .*detector_id/);
    });

    it('throws an actionable error when no input is fully configured', async () => {
      const svc = makeGuardDutyService();
      // Strip the input that has no required vars, leaving only the unsatisfiable one.
      (svc as any).inputs = ['httpjson'];
      (svc as any).varDefsByDataStream.guardduty.inputs = ['httpjson'];
      const targets = buildAgentBasedTargets([], ['guardduty'], new Map([['guardduty', svc]]));

      await expect(
        deployNewAgentPolicy(targets, {
          ...BASE_OPTS,
          globalRegion: '',
          agentPolicyName: 'AWS Onboarding',
        })
      ).rejects.toThrow(/No fully configured input for AWS GuardDuty/);

      expect(mockSendCreateAgentPolicy).not.toHaveBeenCalled();
    });
  });
});

describe('disabled inputs for other policy templates', () => {
  // Regression: Fleet's simplified-to-legacy expansion (simplifiedPackagePolicytoNewPackagePolicy
  // → packageToPackagePolicy) adds ALL policy templates' inputs using manifest defaults, then
  // validates required vars for every enabled input. Sending only `config-cel` for AWS Config
  // left securityhub-httpjson, guardduty-httpjson, etc. enabled with no vars → 400.
  // We must include { enabled: false } for every other template's inputs.
  it('marks inputs from other policy templates disabled when pkgInfo has policy_templates', async () => {
    // makeSimpleService('config') has inputs: ['aws-s3'], so buildPackageInputs emits 'config-aws-s3'.
    const svc = makeSimpleService('config');
    const targets = buildAgentBasedTargets([], ['config'], new Map([['config', svc]]));

    // Simulate a package with two templates: 'config' (ours) and 'securityhub' (other).
    mockSendGetPackageInfo.mockResolvedValue({
      item: {
        version: '3.0.0',
        vars: [],
        policy_templates: [
          {
            name: 'config',
            inputs: [{ type: 'aws-s3' }],
          },
          {
            name: 'securityhub',
            inputs: [{ type: 'httpjson' }],
          },
        ],
      },
    });

    await deployNewAgentPolicy(targets, { ...BASE_OPTS, agentPolicyName: 'AWS Onboarding' });

    const inputs = mockSendCreateAgentPolicy.mock.calls[0][0].package_policies[0].inputs;
    // Our template's input is present and enabled (from buildPackageInputs).
    expect(inputs['config-aws-s3']).toBeDefined();
    expect(inputs['config-aws-s3'].enabled).toBe(true);
    // The other template's input is present but explicitly disabled.
    expect(inputs['securityhub-httpjson']).toEqual({ enabled: false });
  });

  it('does not add disabled entries when pkgInfo has no policy_templates', async () => {
    // Packages with a single template or no template list — disabled-inputs map is empty and
    // the request body is unchanged.
    const svc = makeSimpleService('config');
    const targets = buildAgentBasedTargets([], ['config'], new Map([['config', svc]]));

    // Default mock: { version: '3.0.0', vars: [] } — no policy_templates.
    await deployNewAgentPolicy(targets, { ...BASE_OPTS, agentPolicyName: 'AWS Onboarding' });

    const inputs = mockSendCreateAgentPolicy.mock.calls[0][0].package_policies[0].inputs;
    // Only our service's input is present.
    const keys = Object.keys(inputs);
    expect(keys.every((k) => k.startsWith('config-'))).toBe(true);
  });
});

describe('deployToExistingAgentPolicies', () => {
  it('sends policy_ids with every selected id on each body — no cross product', async () => {
    const svc = makeSimpleService();
    const targets = buildAgentBasedTargets(
      [
        makeInstance(),
        makeInstance({ instanceId: 'vpcflow__dup-1', name: 'Second bucket', isDuplicate: true }),
      ],
      ['vpcflow'],
      new Map([['vpcflow', svc]])
    );

    await deployToExistingAgentPolicies(targets, {
      ...BASE_OPTS,
      selectedAgentPolicyIds: ['policy-a', 'policy-b'],
    });

    // 2 instances × 2 policies would be 4 calls; policy_ids keeps it at 2.
    expect(mockSendCreatePackagePolicy).toHaveBeenCalledTimes(2);
    for (const call of mockSendCreatePackagePolicy.mock.calls) {
      expect(call[0].policy_ids).toEqual(['policy-a', 'policy-b']);
      expect(call[0].namespace).toBeUndefined();
    }
  });

  it('reports per-instance failures without failing the whole batch', async () => {
    const svc = makeSimpleService();
    const targets = buildAgentBasedTargets(
      [
        makeInstance(),
        makeInstance({ instanceId: 'vpcflow__dup-1', name: 'Second bucket', isDuplicate: true }),
      ],
      ['vpcflow'],
      new Map([['vpcflow', svc]])
    );

    mockSendCreatePackagePolicy
      .mockResolvedValueOnce({ item: { id: 'pp-ok' } })
      .mockRejectedValueOnce(new Error('Package policy is invalid'));

    const result = await deployToExistingAgentPolicies(targets, {
      ...BASE_OPTS,
      selectedAgentPolicyIds: ['policy-a'],
    });

    expect(result.packagePolicyIdsByInstance).toEqual({ vpcflow: 'pp-ok' });
    expect(result.failedInstances).toEqual(['vpcflow__dup-1']);
    expect(result.errorsByInstance['vpcflow__dup-1']).toBe('Package policy is invalid');
  });
});

describe('extractErrorMessage', () => {
  // Regression: the callout rendered "[object Object]". sendRequestForRq rethrows
  // response.error verbatim — an IHttpFetchError whose server detail lives in body.message,
  // not .message — so `String(err)` stringified the object.
  it('prefers body.message, where Fleet puts the server validation detail', () => {
    const err = Object.assign(new Error('Bad Request'), {
      body: { message: 'Package policy is invalid: inputs.foo.vars.bar: ["Required"]' },
    });
    expect(extractErrorMessage(err)).toBe(
      'Package policy is invalid: inputs.foo.vars.bar: ["Required"]'
    );
  });

  it('never returns "[object Object]" for a body-carrying error object', () => {
    const err = { body: { message: 'real detail' }, name: 'Error' };
    expect(extractErrorMessage(err)).not.toContain('[object Object]');
  });

  it('falls back to .message for a plain Error', () => {
    expect(extractErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('falls back to body.error when body.message is absent', () => {
    expect(extractErrorMessage({ body: { error: 'Forbidden' } })).toBe('Forbidden');
  });

  it('ignores an empty body.message and uses .message', () => {
    const err = Object.assign(new Error('Bad Request'), { body: { message: '   ' } });
    expect(extractErrorMessage(err)).toBe('Bad Request');
  });

  it('JSON-dumps an object with no recognised message field rather than stringifying it', () => {
    expect(extractErrorMessage({ statusCode: 500 })).toBe('{"statusCode":500}');
  });

  it('passes a string through unchanged', () => {
    expect(extractErrorMessage('plain failure')).toBe('plain failure');
  });

  it('reports null and undefined as Unknown error', () => {
    expect(extractErrorMessage(null)).toBe('Unknown error');
    expect(extractErrorMessage(undefined)).toBe('Unknown error');
  });

  it('survives a circular object', () => {
    const circular: Record<string, unknown> = { statusCode: 500 };
    circular.self = circular;
    expect(() => extractErrorMessage(circular)).not.toThrow();
  });

  it('surfaces the server detail through the existing-policy path', async () => {
    const svc = makeSimpleService();
    const targets = buildAgentBasedTargets([], ['vpcflow'], new Map([['vpcflow', svc]]));

    mockSendCreatePackagePolicy.mockRejectedValueOnce(
      Object.assign(new Error('Bad Request'), {
        body: { message: 'Package policy is invalid: detector_id required' },
      })
    );

    const result = await deployToExistingAgentPolicies(targets, {
      ...BASE_OPTS,
      selectedAgentPolicyIds: ['policy-a'],
    });

    expect(result.errorsByInstance.vpcflow).toBe('Package policy is invalid: detector_id required');
  });
});

describe('secrets', () => {
  it('does not send session_token in the package policy body', async () => {
    const svc = makeSimpleService();
    const targets = buildAgentBasedTargets([], ['vpcflow'], new Map([['vpcflow', svc]]));

    await deployNewAgentPolicy(targets, {
      ...BASE_OPTS,
      authenticateAndDeployStep: {
        staticKeys: { access_key_id: 'AKIA', secret_access_key: 'shhh' },
      } as never,
      agentPolicyName: 'AWS Onboarding',
    });

    const serialized = JSON.stringify(mockSendCreateAgentPolicy.mock.calls[0][0]);
    expect(serialized).not.toContain('session_token');
  });
});

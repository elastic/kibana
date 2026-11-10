/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../../aws_service_matrix';
import type { ServiceVars } from '../../service_settings_step/use_service_settings';
import type { DeployGroup } from '../deploy_groups';
import { buildGroupPackagePolicy } from './package_policy_body';
import type { BuildPackagePolicyOpts, PkgInfo } from './package_policy_body';

/**
 * GuardDuty: one policy template with two inputs. The API input (`httpjson`) requires a detector id
 * and a region, the S3 input requires nothing. Fleet enables both by default.
 */
const guardduty = {
  id: 'guardduty',
  name: 'Amazon GuardDuty',
  signalTypes: ['logs'],
  dataStreams: ['guardduty'],
  packageName: 'aws',
  deploymentMethods: [{ method: 'agent_based', preferred: true }],
  inputs: ['aws-s3', 'httpjson'],
  requiredConfig: [],
  defaultEnabled: true,
  defaultEnabledInputs: ['aws-s3'],
  showInUI: true,
  isManifestLoaded: true,
  isManifestError: false,
  isStaticAgentBasedOnly: false,
  varDefsByInput: {
    'aws-s3': {},
    httpjson: {
      detector_id: { required: true, show_user: true, type: 'text' },
      aws_region: { required: true, show_user: true, type: 'text' },
    },
  },
} as unknown as AwsServiceMatrixEntry;

const pkgInfo: PkgInfo = {
  version: '1.0.0',
  policy_templates: [
    { name: 'guardduty', inputs: [{ type: 'aws-s3' }, { type: 'httpjson' }] },
    { name: 'cloudtrail', inputs: [{ type: 'aws-s3' }] },
  ],
};

const group: DeployGroup = {
  groupId: 'aws',
  instanceIds: ['guardduty'],
  members: [
    {
      instance: {
        instanceId: 'guardduty',
        serviceId: 'guardduty',
        name: 'Amazon GuardDuty',
        isDuplicate: false,
      },
      service: guardduty,
    },
  ],
  isDuplicateGroup: false,
  namespace: '',
};

const withInputs = (
  enabledInputs: string[],
  varsByInput: Record<string, Record<string, string>> = {}
): Record<string, ServiceVars> => ({
  guardduty: {
    enabledDataStreams: ['guardduty'],
    varsByDataStream: { guardduty: { enabledInputs, varsByInput } },
  },
});

const build = (storedServiceVars: Record<string, ServiceVars>, pkg: PkgInfo = pkgInfo) =>
  buildGroupPackagePolicy(group, pkg, {
    namespace: '',
    globalRegion: 'us-east-1',
    storedServiceVars,
    authenticateAndDeployStep: {},
    pkgVersion: '1.0.0',
  } as BuildPackagePolicyOpts);

describe('buildGroupPackagePolicy — inputs of the service policy template', () => {
  it('sends the input the user switched off as disabled', async () => {
    // Collect via S3 only: the API input must not be left to its enabled manifest default, Fleet
    // would validate it and ask for the detector id of an input that is off.
    const body = await build(
      withInputs(['aws-s3'], { 'aws-s3': { bucket_arn: 'arn:aws:s3:::b' } })
    );

    expect(body.inputs['guardduty-httpjson']).toStrictEqual({ enabled: false });
    expect(body.inputs['guardduty-aws-s3']).toMatchObject({ enabled: true });
  });

  it('sends an enabled input whose required vars are missing as disabled', async () => {
    // The user left the API input on but never filled the detector id: it is pruned, and must be
    // sent as disabled rather than omitted.
    const body = await build(withInputs(['aws-s3', 'httpjson']));

    expect(body.inputs['guardduty-httpjson']).toStrictEqual({ enabled: false });
    expect(body.inputs['guardduty-aws-s3']).toMatchObject({ enabled: true });
  });

  it('keeps an input enabled when its required vars are filled', async () => {
    const body = await build(
      withInputs(['aws-s3', 'httpjson'], {
        httpjson: { detector_id: 'abc123', aws_region: 'us-east-1' },
      })
    );

    expect(body.inputs['guardduty-httpjson']).toMatchObject({ enabled: true });
    expect(body.inputs['guardduty-aws-s3']).toMatchObject({ enabled: true });
  });

  it('still disables the inputs of the other policy templates', async () => {
    const body = await build(withInputs(['aws-s3']));

    expect(body.inputs['cloudtrail-aws-s3']).toStrictEqual({ enabled: false });
  });

  it('disables every input of the service when none is configured', async () => {
    const noDataStreams = {
      ...guardduty,
      dataStreams: [],
    } as unknown as AwsServiceMatrixEntry;
    const body = await buildGroupPackagePolicy(
      { ...group, members: [{ ...group.members[0], service: noDataStreams }] },
      pkgInfo,
      {
        namespace: '',
        globalRegion: 'us-east-1',
        storedServiceVars: {},
        authenticateAndDeployStep: {},
        pkgVersion: '1.0.0',
      } as BuildPackagePolicyOpts
    );

    expect(body.inputs).toStrictEqual({
      'guardduty-aws-s3': { enabled: false },
      'guardduty-httpjson': { enabled: false },
      'cloudtrail-aws-s3': { enabled: false },
    });
  });

  it('leaves the data streams the manifest disables by default off for a never-configured service', async () => {
    // Bedrock shape: metrics stream on by default, CloudWatch log stream off by default.
    const bedrock = {
      ...guardduty,
      id: 'bedrock',
      dataStreams: ['guardrails', 'invocation'],
      inputs: ['aws/metrics', 'aws-cloudwatch'],
      defaultEnabledInputs: ['aws/metrics'],
      varDefsByInput: { 'aws/metrics': {}, 'aws-cloudwatch': {} },
      varDefsByDataStream: {
        guardrails: {
          inputs: ['aws/metrics'],
          defaultEnabledInputs: ['aws/metrics'],
          varDefsByInput: { 'aws/metrics': {} },
        },
        invocation: {
          inputs: ['aws-cloudwatch'],
          defaultEnabledInputs: [],
          varDefsByInput: { 'aws-cloudwatch': {} },
        },
      },
    } as unknown as AwsServiceMatrixEntry;
    const body = await buildGroupPackagePolicy(
      {
        ...group,
        members: [
          {
            instance: { ...group.members[0].instance, instanceId: 'bedrock', serviceId: 'bedrock' },
            service: bedrock,
          },
        ],
      },
      {
        version: '1.0.0',
        policy_templates: [
          { name: 'bedrock', inputs: [{ type: 'aws/metrics' }, { type: 'aws-cloudwatch' }] },
        ],
      },
      {
        namespace: '',
        globalRegion: 'us-east-1',
        storedServiceVars: {},
        authenticateAndDeployStep: {},
        pkgVersion: '1.0.0',
      } as BuildPackagePolicyOpts
    );

    expect(body.inputs['bedrock-aws/metrics']).toMatchObject({ enabled: true });
    expect(body.inputs['bedrock-aws-cloudwatch']).toStrictEqual({ enabled: false });
  });
});

describe('buildGroupPackagePolicy — output', () => {
  const buildWithOutput = (outputId?: string) =>
    buildGroupPackagePolicy(group, pkgInfo, {
      namespace: '',
      globalRegion: 'us-east-1',
      storedServiceVars: withInputs(['aws-s3']),
      authenticateAndDeployStep: {},
      pkgVersion: '1.0.0',
      policySettings: { output_id: outputId },
    } as BuildPackagePolicyOpts);

  it('sends the chosen output', async () => {
    expect((await buildWithOutput('logstash-1')).output_id).toBe('logstash-1');
  });

  it('leaves the output out when none is chosen, so the agent policy output applies', async () => {
    expect(await buildWithOutput(undefined)).not.toHaveProperty('output_id');
    expect(await buildWithOutput('')).not.toHaveProperty('output_id');
  });
});

describe('buildGroupPackagePolicy — condition', () => {
  const buildWithCondition = (condition?: string) =>
    buildGroupPackagePolicy(group, pkgInfo, {
      namespace: '',
      globalRegion: 'us-east-1',
      storedServiceVars: withInputs(['aws-s3']),
      authenticateAndDeployStep: {},
      pkgVersion: '1.0.0',
      policySettings: { condition },
    } as BuildPackagePolicyOpts);

  it('sends the condition', async () => {
    expect((await buildWithCondition('${host.platform} == "linux"')).condition).toBe(
      '${host.platform} == "linux"'
    );
  });

  it('leaves a blank condition out', async () => {
    expect(await buildWithCondition(undefined)).not.toHaveProperty('condition');
    expect(await buildWithCondition('  ')).not.toHaveProperty('condition');
  });
});

describe('buildGroupPackagePolicy — proxy URL', () => {
  const buildWithProxy = (proxyUrl: string | undefined, declared = true) =>
    buildGroupPackagePolicy(
      group,
      { ...pkgInfo, vars: declared ? [{ name: 'proxy_url' }] : [] } as PkgInfo,
      {
        namespace: '',
        globalRegion: '',
        storedServiceVars: withInputs(['aws-s3']),
        authenticateAndDeployStep: {},
        pkgVersion: '1.0.0',
        policySettings: { proxy_url: proxyUrl },
      } as BuildPackagePolicyOpts
    );

  it('sends the proxy as a package var, not a top-level field', async () => {
    const body = await buildWithProxy('http://proxy:3128');
    expect(body.vars).toEqual({ proxy_url: 'http://proxy:3128' });
    expect(body).not.toHaveProperty('proxy_url');
  });

  it('leaves it out when empty or when the package does not declare the var', async () => {
    expect((await buildWithProxy('')).vars).toBeUndefined();
    expect((await buildWithProxy(undefined)).vars).toBeUndefined();
    expect((await buildWithProxy('http://proxy:3128', false)).vars).toBeUndefined();
  });
});

describe('buildGroupPackagePolicy — dedicated index template for a custom dataset', () => {
  const withDatasetVar = {
    ...guardduty,
    varDefsByInput: {
      'aws-s3': {
        'data_stream.dataset': {
          name: 'data_stream.dataset',
          type: 'text',
          default: 'aws.guardduty',
        },
      },
    },
    varDefsByDataStream: {
      guardduty: {
        inputs: ['aws-s3'],
        defaultEnabledInputs: ['aws-s3'],
        varDefsByInput: {
          'aws-s3': {
            'data_stream.dataset': {
              name: 'data_stream.dataset',
              type: 'text',
              default: 'aws.guardduty',
            },
          },
        },
      },
    },
  } as unknown as AwsServiceMatrixEntry;
  const datasetGroup: DeployGroup = {
    ...group,
    members: [{ ...group.members[0], service: withDatasetVar }],
  };
  const buildWithDataset = (dataset: string, createDatasetTemplates?: boolean) =>
    buildGroupPackagePolicy(datasetGroup, pkgInfo, {
      namespace: '',
      globalRegion: 'us-east-1',
      storedServiceVars: {
        guardduty: {
          enabledDataStreams: ['guardduty'],
          varsByDataStream: {
            guardduty: {
              enabledInputs: ['aws-s3'],
              varsByInput: { 'aws-s3': { 'data_stream.dataset': dataset } },
              ...(createDatasetTemplates !== undefined ? { createDatasetTemplates } : {}),
            },
          },
        },
      },
      authenticateAndDeployStep: {},
      pkgVersion: '1.0.0',
    } as BuildPackagePolicyOpts);

  it('asks Fleet not to create the template when the user opted out', async () => {
    expect(await buildWithDataset('aws.prod', false)).toHaveProperty(
      'create_dataset_templates',
      false
    );
  });

  it('leaves the flag out by default so Fleet keeps its own', async () => {
    expect(await buildWithDataset('aws.prod')).not.toHaveProperty('create_dataset_templates');
  });

  it('never sends the choice as a package var', async () => {
    const body = await buildWithDataset('aws.prod', false);
    expect(JSON.stringify(body.inputs)).not.toContain('createDatasetTemplates');
  });
});

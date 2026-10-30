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
});

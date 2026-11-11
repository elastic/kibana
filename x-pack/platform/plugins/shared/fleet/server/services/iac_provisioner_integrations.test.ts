/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import type { RenderIacTemplateIntegration } from '../../common/types/rest_spec/iac_provisioner';
import { PackageNotFoundError, RegistryResponseError } from '../errors';

import { getPackageInfo } from './epm/packages';

import { buildIacProvisionerIntegrations, isBuildError } from './iac_provisioner_integrations';

jest.mock('./epm/packages');

const mockedGetPackageInfo = jest.mocked(getPackageInfo);

const savedObjectsClient = savedObjectsClientMock.create();

/** The slice of registry package info the resolver reads. */
interface FakePackageInfo {
  name: string;
  version: string;
  policy_templates?: Array<{ name: string; inputs?: Array<{ type: string }>; input?: string }>;
}

/** An input package: one policy template declaring its single input as `input`, not `inputs`. */
const CLOUDWATCH_INPUT_PACKAGE_INFO: FakePackageInfo = {
  name: 'aws_cloudwatch_input_otel',
  version: '0.3.0',
  policy_templates: [{ name: 'aws_cloudwatch_input_otel', input: 'otelcol' }],
};

const CSPM_PACKAGE_INFO: FakePackageInfo = {
  name: 'cloud_security_posture',
  version: '3.5.0',
  policy_templates: [
    {
      name: 'cspm',
      inputs: [{ type: 'cloudbeat/cis_aws' }, { type: 'cloudbeat/cis_gcp' }],
    },
  ],
};

const AWS_PACKAGE_INFO: FakePackageInfo = {
  name: 'aws',
  version: '7.1.0',
  policy_templates: [
    { name: 'guardduty', inputs: [{ type: 'aws-s3' }, { type: 'aws-cloudwatch' }] },
    { name: 's3', inputs: [{ type: 'aws-s3' }] },
  ],
};

const cspmSelection: RenderIacTemplateIntegration = {
  name: 'cloud_security_posture',
  policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
};

const resolvedCspm = {
  name: 'cloud_security_posture',
  version: '3.5.0',
  policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
};

/** Two entries for the same package, overlapping templates and inputs. */
const duplicatedAwsSelections: RenderIacTemplateIntegration[] = [
  { name: 'aws', policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }] },
  {
    name: 'aws',
    policyTemplates: [
      { name: 's3', enabledInputs: ['aws-s3'] },
      { name: 'guardduty', enabledInputs: ['aws-cloudwatch'] },
    ],
  },
];

const mergedAws = {
  name: 'aws',
  version: '7.1.0',
  policyTemplates: [
    { name: 'guardduty', enabledInputs: ['aws-s3', 'aws-cloudwatch'] },
    { name: 's3', enabledInputs: ['aws-s3'] },
  ],
};

const packageInfoByName = (infos: FakePackageInfo[]) =>
  mockedGetPackageInfo.mockImplementation(async ({ pkgName }) => {
    const info = infos.find(({ name }) => name === pkgName);
    if (!info) {
      throw new PackageNotFoundError(`[${pkgName}] package not installed or found in registry`);
    }
    return info as any;
  });

const build = (requestedIntegrations: RenderIacTemplateIntegration[]) =>
  buildIacProvisionerIntegrations({ savedObjectsClient, requestedIntegrations });

beforeEach(() => {
  mockedGetPackageInfo.mockReset();
});

describe('buildIacProvisionerIntegrations', () => {
  it('resolves the package version from the registry and sends only the inputs the caller enabled', async () => {
    packageInfoByName([CSPM_PACKAGE_INFO]);

    const result = await build([cspmSelection]);

    // cis_gcp is declared by the manifest but the user did not enable it, so IaCP must never
    // see it — every input listed becomes a blueprint patch, i.e. a granted permission.
    expect(result).toEqual({ integrations: [resolvedCspm] });
    expect(mockedGetPackageInfo).toHaveBeenCalledWith({
      savedObjectsClient,
      pkgName: 'cloud_security_posture',
      pkgVersion: '',
      skipArchive: true,
    });
  });

  it('merges duplicate package entries and unions enabledInputs per policy template', async () => {
    packageInfoByName([AWS_PACKAGE_INFO]);

    const result = await build(duplicatedAwsSelections);

    expect(mockedGetPackageInfo).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ integrations: [mergedAws] });
  });

  it('returns a build error when a requested policy template is not on the package', async () => {
    packageInfoByName([CSPM_PACKAGE_INFO]);

    const result = await build([
      {
        name: 'cloud_security_posture',
        policyTemplates: [{ name: 'kspm', enabledInputs: ['cloudbeat/cis_k8s'] }],
      },
    ]);

    expect(isBuildError(result)).toBe(true);
    expect(result).toEqual({
      errorMessage: 'cloud_security_posture has no policy template named kspm',
    });
  });

  it('returns a build error when an enabled input is not declared on the policy template', async () => {
    packageInfoByName([CSPM_PACKAGE_INFO]);

    const result = await build([
      {
        name: 'cloud_security_posture',
        policyTemplates: [
          { name: 'cspm', enabledInputs: ['cloudbeat/cis_aws', 'cloudbeat/cis_azure'] },
        ],
      },
    ]);

    expect(result).toEqual({
      errorMessage:
        'cloud_security_posture policy template cspm has no inputs named cloudbeat/cis_azure',
    });
  });

  it('reads the single input an input package declares as `input` when validating enabled inputs', async () => {
    packageInfoByName([CLOUDWATCH_INPUT_PACKAGE_INFO]);

    const resolved = await build([
      {
        name: 'aws_cloudwatch_input_otel',
        policyTemplates: [{ name: 'aws_cloudwatch_input_otel', enabledInputs: ['otelcol'] }],
      },
    ]);
    expect(resolved).toEqual({
      integrations: [
        {
          name: 'aws_cloudwatch_input_otel',
          version: '0.3.0',
          policyTemplates: [{ name: 'aws_cloudwatch_input_otel', enabledInputs: ['otelcol'] }],
        },
      ],
    });

    const rejected = await build([
      {
        name: 'aws_cloudwatch_input_otel',
        policyTemplates: [{ name: 'aws_cloudwatch_input_otel', enabledInputs: ['aws-cloudwatch'] }],
      },
    ]);
    expect(rejected).toEqual({
      errorMessage:
        'aws_cloudwatch_input_otel policy template aws_cloudwatch_input_otel has no inputs named aws-cloudwatch',
    });
  });

  it('rejects with PackageNotFoundError when a requested package does not exist', async () => {
    packageInfoByName([]);

    await expect(
      build([{ name: 'no_such_package', policyTemplates: [{ name: 't', enabledInputs: ['x'] }] }])
    ).rejects.toBeInstanceOf(PackageNotFoundError);
  });

  it('rejects when the registry fails for a reason other than not found', async () => {
    mockedGetPackageInfo.mockRejectedValue(new RegistryResponseError('registry unavailable', 500));

    await expect(build([cspmSelection])).rejects.toBeInstanceOf(RegistryResponseError);
  });
});

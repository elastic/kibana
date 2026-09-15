/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import type { RenderIacTemplateIntegration } from '../../common/types/rest_spec/iac_provisioner';
import { PackageNotFoundError, RegistryResponseError } from '../errors';

import { appContextService } from './app_context';
import { getPackageInfo } from './epm/packages';

import { buildIacProvisionerIntegrations, isBuildError } from './iac_provisioner_integrations';

jest.mock('./app_context');
jest.mock('./epm/packages');

const mockedGetPackageInfo = jest.mocked(getPackageInfo);

const savedObjectsClient = savedObjectsClientMock.create();
let logger: ReturnType<typeof loggingSystemMock.createLogger>;

/** The slice of registry package info the resolver reads. */
interface FakePackageInfo {
  name: string;
  version: string;
  policy_templates?: Array<{ name: string; inputs?: Array<{ type: string }> }>;
}

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

beforeEach(() => {
  mockedGetPackageInfo.mockReset();
  logger = loggingSystemMock.createLogger();
  jest.spyOn(appContextService, 'getLogger').mockReturnValue(logger);
});

describe('buildIacProvisionerIntegrations', () => {
  describe('strict', () => {
    const build = (requestedIntegrations: RenderIacTemplateIntegration[]) =>
      buildIacProvisionerIntegrations({
        savedObjectsClient,
        requestedIntegrations,
        mode: 'strict',
      });

    it('resolves the package version from the registry and sends only the inputs the caller enabled', async () => {
      packageInfoByName([CSPM_PACKAGE_INFO]);

      const result = await build([cspmSelection]);

      // cis_gcp is declared by the manifest but the user did not enable it, so IaCP must never
      // see it — every input listed becomes a blueprint patch, i.e. a granted permission.
      expect(result).toEqual({ integrations: [resolvedCspm], skipped: [], dropped: [] });
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
      expect(result).toEqual({ integrations: [mergedAws], skipped: [], dropped: [] });
    });

    it('keeps one entry per package, in request order', async () => {
      packageInfoByName([AWS_PACKAGE_INFO, CSPM_PACKAGE_INFO]);

      const result = await build([
        { name: 'aws', policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }] },
        cspmSelection,
      ]);

      expect(mockedGetPackageInfo).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        integrations: [
          {
            name: 'aws',
            version: '7.1.0',
            policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }],
          },
          resolvedCspm,
        ],
        skipped: [],
        dropped: [],
      });
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
      expect(logger.warn).not.toHaveBeenCalled();
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

    it('rejects with PackageNotFoundError when a requested package does not exist', async () => {
      packageInfoByName([]);

      await expect(
        build([{ name: 'no_such_package', policyTemplates: [{ name: 't', enabledInputs: ['x'] }] }])
      ).rejects.toBeInstanceOf(PackageNotFoundError);
    });
  });

  describe('lenient', () => {
    const build = (requestedIntegrations: RenderIacTemplateIntegration[]) =>
      buildIacProvisionerIntegrations({
        savedObjectsClient,
        requestedIntegrations,
        mode: 'lenient',
      });

    it('resolves a fully declared set exactly as strict mode does', async () => {
      packageInfoByName([CSPM_PACKAGE_INFO]);

      const result = await build([cspmSelection]);

      expect(result).toEqual({ integrations: [resolvedCspm], skipped: [], dropped: [] });
      expect(mockedGetPackageInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          pkgName: 'cloud_security_posture',
          pkgVersion: '',
          skipArchive: true,
        })
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('merges duplicate package entries and unions enabledInputs per policy template', async () => {
      packageInfoByName([AWS_PACKAGE_INFO]);

      const result = await build(duplicatedAwsSelections);

      expect(mockedGetPackageInfo).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ integrations: [mergedAws], skipped: [], dropped: [] });
    });

    it('sends input types that name no cloud provider (cel/httpjson)', async () => {
      // The user enabled both and the manifest declares both, so both go out.
      packageInfoByName([
        {
          name: 'some_saas',
          version: '1.0.0',
          policy_templates: [{ name: 'logs', inputs: [{ type: 'cel' }, { type: 'httpjson' }] }],
        },
      ]);

      const result = await build([
        {
          name: 'some_saas',
          policyTemplates: [{ name: 'logs', enabledInputs: ['cel', 'httpjson'] }],
        },
      ]);

      expect(result).toEqual({
        integrations: [
          {
            name: 'some_saas',
            version: '1.0.0',
            policyTemplates: [{ name: 'logs', enabledInputs: ['cel', 'httpjson'] }],
          },
        ],
        skipped: [],
        dropped: [],
      });
    });

    it('drops a policy template the manifest does not declare, reporting it, and keeps the package', async () => {
      packageInfoByName([AWS_PACKAGE_INFO]);

      const result = await build([
        {
          name: 'aws',
          policyTemplates: [
            { name: 's3', enabledInputs: ['aws-s3'] },
            { name: 'removed_in_this_version', enabledInputs: ['aws-s3'] },
          ],
        },
      ]);

      expect(result).toEqual({
        integrations: [
          {
            name: 'aws',
            version: '7.1.0',
            policyTemplates: [{ name: 's3', enabledInputs: ['aws-s3'] }],
          },
        ],
        skipped: [],
        dropped: ['aws/removed_in_this_version'],
      });
      expect(logger.warn).toHaveBeenCalledWith(
        'Dropped from aws@7.1.0, not declared by the manifest: policy templates removed_in_this_version'
      );
    });

    it('drops an enabled input the policy template does not declare, reporting it, and keeps the rest', async () => {
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
        integrations: [resolvedCspm],
        skipped: [],
        dropped: ['cloud_security_posture/cspm/cloudbeat/cis_azure'],
      });
      expect(logger.warn).toHaveBeenCalledWith(
        'Dropped from cloud_security_posture@3.5.0, not declared by the manifest: inputs cspm/cloudbeat/cis_azure'
      );
    });

    it('logs one warn line per package listing every dropped template and input', async () => {
      packageInfoByName([AWS_PACKAGE_INFO]);

      const result = await build([
        {
          name: 'aws',
          policyTemplates: [
            { name: 'gone', enabledInputs: ['aws-s3'] },
            { name: 'guardduty', enabledInputs: ['aws-s3', 'aws-old', 'aws-older'] },
            { name: 's3', enabledInputs: ['aws-s3'] },
          ],
        },
      ]);

      expect(result).toEqual({
        integrations: [
          {
            name: 'aws',
            version: '7.1.0',
            policyTemplates: [
              { name: 'guardduty', enabledInputs: ['aws-s3'] },
              { name: 's3', enabledInputs: ['aws-s3'] },
            ],
          },
        ],
        skipped: [],
        dropped: ['aws/gone', 'aws/guardduty/aws-old', 'aws/guardduty/aws-older'],
      });
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        'Dropped from aws@7.1.0, not declared by the manifest: policy templates gone; inputs guardduty/aws-old, guardduty/aws-older'
      );
    });

    it('drops a policy template whose every enabled input is undeclared', async () => {
      packageInfoByName([AWS_PACKAGE_INFO]);

      const result = await build([
        {
          name: 'aws',
          policyTemplates: [
            { name: 's3', enabledInputs: ['aws-s3'] },
            { name: 'guardduty', enabledInputs: ['aws-renamed'] },
          ],
        },
      ]);

      expect(result).toEqual({
        integrations: [
          {
            name: 'aws',
            version: '7.1.0',
            policyTemplates: [{ name: 's3', enabledInputs: ['aws-s3'] }],
          },
        ],
        skipped: [],
        dropped: ['aws/guardduty/aws-renamed'],
      });
    });

    it('skips a package whose manifest declares none of the requested templates', async () => {
      packageInfoByName([
        { name: 'inputless', version: '1.0.0', policy_templates: [{ name: 'other', inputs: [] }] },
      ]);

      const result = await build([
        { name: 'inputless', policyTemplates: [{ name: 'logs', enabledInputs: ['cel'] }] },
      ]);

      expect(result).toEqual({
        integrations: [],
        skipped: ['inputless'],
        dropped: ['inputless/logs'],
      });
      expect(logger.debug).toHaveBeenCalledWith(
        'Skipped inputless@1.0.0: manifest declares none of the requested policy templates or inputs'
      );
    });

    it('skips a package whose every requested input is undeclared', async () => {
      packageInfoByName([AWS_PACKAGE_INFO]);

      const result = await build([
        { name: 'aws', policyTemplates: [{ name: 's3', enabledInputs: ['aws-renamed'] }] },
      ]);

      expect(result).toEqual({
        integrations: [],
        skipped: ['aws'],
        dropped: ['aws/s3/aws-renamed'],
      });
    });

    it('tolerates package info with no policy_templates', async () => {
      packageInfoByName([{ name: 'pkg', version: '1.0.0' }]);

      const result = await build([
        { name: 'pkg', policyTemplates: [{ name: 'tpl', enabledInputs: ['aws-s3'] }] },
      ]);

      expect(result).toEqual({ integrations: [], skipped: ['pkg'], dropped: ['pkg/tpl'] });
    });

    it('skips a package that is not installed or in the registry and still resolves the others', async () => {
      packageInfoByName([CSPM_PACKAGE_INFO]);

      const result = await build([
        { name: 'no_such_package', policyTemplates: [{ name: 't', enabledInputs: ['x'] }] },
        cspmSelection,
      ]);

      expect(result).toEqual({
        integrations: [resolvedCspm],
        skipped: ['no_such_package'],
        dropped: [],
      });
      expect(logger.debug).toHaveBeenCalledWith(
        'Skipped no_such_package: not installed or found in registry'
      );
    });

    it('still throws when the registry fails for a reason other than not found', async () => {
      mockedGetPackageInfo.mockRejectedValue(
        new RegistryResponseError('registry unavailable', 500)
      );

      await expect(build([cspmSelection])).rejects.toBeInstanceOf(RegistryResponseError);
    });

    it('still throws on an unexpected error', async () => {
      mockedGetPackageInfo.mockRejectedValue(new Error('boom'));

      await expect(build([cspmSelection])).rejects.toThrow('boom');
    });
  });
});

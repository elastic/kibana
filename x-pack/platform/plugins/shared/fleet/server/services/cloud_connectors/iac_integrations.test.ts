/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../../common/constants';
import { VERIFIER_PKG_NAME } from '../../../common/constants/cloud_connector';
import { appContextService } from '../app_context';
import { getPackageInfo } from '../epm/packages';

import {
  getCloudConnectorIntegrationSelections,
  mergeIntegrationSelections,
  resolveIacRenderIntegrations,
} from './iac_integrations';

jest.mock('../app_context');
jest.mock('../epm/packages');

const mockedGetPackageInfo = jest.mocked(getPackageInfo);

const soClient = savedObjectsClientMock.create();

beforeEach(() => {
  jest.spyOn(appContextService, 'getLogger').mockReturnValue(loggingSystemMock.createLogger());
});

describe('mergeIntegrationSelections', () => {
  it('unions policy templates per package and sorts deterministically', () => {
    expect(
      mergeIntegrationSelections([
        {
          name: 'aws',
          policyTemplates: [
            { name: 's3', enabledInputs: ['aws-s3'] },
            { name: 'cloudtrail', enabledInputs: ['aws-s3'] },
          ],
        },
        {
          name: 'cloud_security_posture',
          policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
        },
        {
          name: 'aws',
          policyTemplates: [
            { name: 'guardduty', enabledInputs: ['aws-s3'] },
            { name: 'cloudtrail', enabledInputs: ['aws-cloudwatch'] },
          ],
        },
      ])
    ).toEqual([
      {
        name: 'aws',
        policyTemplates: [
          { name: 'cloudtrail', enabledInputs: ['aws-cloudwatch', 'aws-s3'] },
          { name: 'guardduty', enabledInputs: ['aws-s3'] },
          { name: 's3', enabledInputs: ['aws-s3'] },
        ],
      },
      {
        name: 'cloud_security_posture',
        policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
      },
    ]);
  });

  it('dedupes an input type enabled under the same policy template twice', () => {
    expect(
      mergeIntegrationSelections([
        { name: 'aws', policyTemplates: [{ name: 's3', enabledInputs: ['aws-s3'] }] },
        { name: 'aws', policyTemplates: [{ name: 's3', enabledInputs: ['aws-s3'] }] },
      ])
    ).toEqual([{ name: 'aws', policyTemplates: [{ name: 's3', enabledInputs: ['aws-s3'] }] }]);
  });
});

describe('getCloudConnectorIntegrationSelections', () => {
  beforeEach(() => soClient.find.mockReset());

  it('derives the enabled input types per policy template from the policies on the connector', async () => {
    soClient.find.mockResolvedValueOnce({
      saved_objects: [
        {
          attributes: {
            package: { name: 'aws' },
            inputs: [
              { type: 'aws-s3', enabled: true, policy_template: 'cloudtrail' },
              { type: 'aws-cloudwatch', enabled: false, policy_template: 'cloudtrail' },
              { type: 'aws-s3', enabled: false, policy_template: 's3' },
            ],
          },
        },
        {
          attributes: {
            package: { name: 'aws' },
            inputs: [{ type: 'aws-cloudwatch', enabled: true, policy_template: 'guardduty' }],
          },
        },
        {
          attributes: { inputs: [{ type: 'aws-s3', enabled: true, policy_template: 'orphan' }] },
        },
      ],
    } as any);

    const result = await getCloudConnectorIntegrationSelections(soClient, 'cc-1');

    expect(result).toEqual([
      {
        name: 'aws',
        policyTemplates: [
          { name: 'cloudtrail', enabledInputs: ['aws-s3'] },
          { name: 'guardduty', enabledInputs: ['aws-cloudwatch'] },
        ],
      },
    ]);
    expect(soClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        perPage: SO_SEARCH_LIMIT,
        fields: ['package.name', 'inputs.type', 'inputs.enabled', 'inputs.policy_template'],
        filter: expect.stringContaining('cloud_connector_id:"cc-1"'),
      })
    );
    const { filter } = soClient.find.mock.calls[0][0];
    expect(filter).toContain(
      `NOT ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.package.name:"${VERIFIER_PKG_NAME}"`
    );
    expect(filter).toContain('attributes.latest_revision:true');
  });

  it('returns [] when the connector has no policies', async () => {
    soClient.find.mockResolvedValueOnce({ saved_objects: [] } as any);
    expect(await getCloudConnectorIntegrationSelections(soClient, 'cc-1')).toEqual([]);
  });

  it('escapes quotes in the connector id so it cannot break out of the KQL phrase', async () => {
    soClient.find.mockResolvedValueOnce({ saved_objects: [] } as any);
    await getCloudConnectorIntegrationSelections(soClient, 'cc-1" or attributes.name:*');
    const { filter } = soClient.find.mock.calls[0][0];
    expect(filter).toContain('cloud_connector_id:"cc-1\\" or attributes.name:*"');
  });

  it('drops a policy whose inputs are all disabled', async () => {
    soClient.find.mockResolvedValueOnce({
      saved_objects: [
        {
          attributes: {
            package: { name: 'aws' },
            inputs: [{ type: 'aws-s3', enabled: false, policy_template: 's3' }],
          },
        },
      ],
    } as any);
    expect(await getCloudConnectorIntegrationSelections(soClient, 'cc-1')).toEqual([]);
  });
});

describe('resolveIacRenderIntegrations', () => {
  beforeEach(() => mockedGetPackageInfo.mockReset());

  it('resolves the package version and sends only the inputs the caller enabled', async () => {
    mockedGetPackageInfo.mockResolvedValueOnce({
      name: 'cloud_security_posture',
      version: '3.5.0',
      policy_templates: [
        {
          name: 'cspm',
          inputs: [
            { type: 'cloudbeat/cis_aws', title: '', description: '' },
            { type: 'cloudbeat/cis_gcp', title: '', description: '' },
          ],
        },
      ],
    } as any);

    const result = await resolveIacRenderIntegrations(soClient, 'aws', [
      {
        name: 'cloud_security_posture',
        policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
      },
    ]);

    // cis_gcp is declared by the manifest but the user did not enable it, so IaCP must
    // never see it — every input listed becomes a blueprint patch, i.e. a granted permission.
    expect(result).toEqual({
      integrations: [
        {
          name: 'cloud_security_posture',
          version: '3.5.0',
          policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
        },
      ],
      skipped: [],
    });
    expect(mockedGetPackageInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        pkgName: 'cloud_security_posture',
        pkgVersion: '',
        skipArchive: true,
      })
    );
  });

  it('sends input types that name no cloud provider (cel/httpjson)', async () => {
    // The user enabled both, so both go out. IaCP validates the names itself and rejects
    // unknown ones with render.no_matching_inputs_for_policy_template.
    mockedGetPackageInfo.mockResolvedValueOnce({
      name: 'some_saas',
      version: '1.0.0',
      policy_templates: [
        {
          name: 'logs',
          inputs: [
            { type: 'cel', title: '', description: '' },
            { type: 'httpjson', title: '', description: '' },
          ],
        },
      ],
    } as any);

    const result = await resolveIacRenderIntegrations(soClient, 'aws', [
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
    });
  });

  it('drops a requested policy template the package manifest does not declare', async () => {
    mockedGetPackageInfo.mockResolvedValueOnce({
      name: 'aws',
      version: '7.0.0',
      policy_templates: [
        { name: 'cloudtrail', inputs: [{ type: 'aws-s3', title: '', description: '' }] },
      ],
    } as any);

    const result = await resolveIacRenderIntegrations(soClient, 'aws', [
      {
        name: 'aws',
        policyTemplates: [
          { name: 'cloudtrail', enabledInputs: ['aws-s3'] },
          { name: 'removed_in_this_version', enabledInputs: ['aws-s3'] },
        ],
      },
    ]);

    expect(result).toEqual({
      integrations: [
        {
          name: 'aws',
          version: '7.0.0',
          policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-s3'] }],
        },
      ],
      skipped: [],
    });
  });

  it('reports a package as skipped when the manifest declares none of the requested templates', async () => {
    mockedGetPackageInfo.mockResolvedValueOnce({
      name: 'inputless',
      version: '1.0.0',
      policy_templates: [{ name: 'other', inputs: [] }],
    } as any);

    const result = await resolveIacRenderIntegrations(soClient, 'aws', [
      { name: 'inputless', policyTemplates: [{ name: 'logs', enabledInputs: ['cel'] }] },
    ]);

    expect(result).toEqual({ integrations: [], skipped: ['inputless'] });
  });

  it('tolerates package info with no policy_templates', async () => {
    mockedGetPackageInfo.mockResolvedValueOnce({
      name: 'pkg',
      version: '1.0.0',
    } as any);

    const result = await resolveIacRenderIntegrations(soClient, 'aws', [
      { name: 'pkg', policyTemplates: [{ name: 'tpl', enabledInputs: ['aws-s3'] }] },
    ]);

    expect(result).toEqual({ integrations: [], skipped: ['pkg'] });
  });
});

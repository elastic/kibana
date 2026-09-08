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
        { name: 'aws', policyTemplates: ['s3', 'cloudtrail'] },
        { name: 'cloud_security_posture', policyTemplates: ['cspm'] },
        { name: 'aws', policyTemplates: ['guardduty', 'cloudtrail'] },
      ])
    ).toEqual([
      { name: 'aws', policyTemplates: ['cloudtrail', 'guardduty', 's3'] },
      { name: 'cloud_security_posture', policyTemplates: ['cspm'] },
    ]);
  });
});

describe('getCloudConnectorIntegrationSelections', () => {
  beforeEach(() => soClient.find.mockReset());

  it('derives {name, policyTemplates} from enabled inputs of policies on the connector', async () => {
    soClient.find.mockResolvedValueOnce({
      saved_objects: [
        {
          attributes: {
            package: { name: 'aws' },
            inputs: [
              { enabled: true, policy_template: 'cloudtrail' },
              { enabled: false, policy_template: 's3' },
            ],
          },
        },
        {
          attributes: {
            package: { name: 'aws' },
            inputs: [{ enabled: true, policy_template: 'guardduty' }],
          },
        },
        { attributes: { inputs: [{ enabled: true, policy_template: 'orphan' }] } },
      ],
    } as any);

    const result = await getCloudConnectorIntegrationSelections(soClient, 'cc-1');

    expect(result).toEqual([{ name: 'aws', policyTemplates: ['cloudtrail', 'guardduty'] }]);
    expect(soClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        perPage: SO_SEARCH_LIMIT,
        fields: ['package.name', 'inputs.enabled', 'inputs.policy_template'],
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

  it('drops a policy whose inputs are all disabled', async () => {
    soClient.find.mockResolvedValueOnce({
      saved_objects: [
        {
          attributes: {
            package: { name: 'aws' },
            inputs: [{ enabled: false, policy_template: 's3' }],
          },
        },
      ],
    } as any);
    expect(await getCloudConnectorIntegrationSelections(soClient, 'cc-1')).toEqual([]);
  });
});

describe('resolveIacRenderIntegrations', () => {
  beforeEach(() => mockedGetPackageInfo.mockReset());

  it('resolves version and provider-relevant enabled inputs, reporting empty packages as skipped', async () => {
    mockedGetPackageInfo.mockImplementation(async ({ pkgName }) => {
      if (pkgName === 'cloud_security_posture') {
        return {
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
        } as any;
      }
      return {
        name: 'azure_only',
        version: '1.0.0',
        policy_templates: [
          { name: 'logs', inputs: [{ type: 'azure-eventhub', title: '', description: '' }] },
        ],
      } as any;
    });

    const result = await resolveIacRenderIntegrations(soClient, 'aws', [
      { name: 'cloud_security_posture', policyTemplates: ['cspm'] },
      { name: 'azure_only', policyTemplates: ['logs'] },
    ]);

    expect(result).toEqual({
      integrations: [
        {
          name: 'cloud_security_posture',
          version: '3.5.0',
          policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
        },
      ],
      skipped: ['azure_only'],
    });
    expect(mockedGetPackageInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        pkgName: 'cloud_security_posture',
        pkgVersion: '',
        skipArchive: true,
      })
    );
  });

  it('dedupes input types within a policy template', async () => {
    mockedGetPackageInfo.mockResolvedValueOnce({
      name: 'aws',
      version: '7.0.0',
      policy_templates: [
        {
          name: 'cloudtrail',
          inputs: [
            { type: 'cloudbeat/cis_aws', title: '', description: '' },
            { type: 'cloudbeat/cis_aws', title: '', description: '' },
          ],
        },
      ],
    } as any);

    const result = await resolveIacRenderIntegrations(soClient, 'aws', [
      { name: 'aws', policyTemplates: ['cloudtrail'] },
    ]);

    expect(result.integrations).toEqual([
      {
        name: 'aws',
        version: '7.0.0',
        policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['cloudbeat/cis_aws'] }],
      },
    ]);
  });

  it('tolerates package info with no policy_templates', async () => {
    mockedGetPackageInfo.mockResolvedValueOnce({
      name: 'pkg',
      version: '1.0.0',
    } as any);

    const result = await resolveIacRenderIntegrations(soClient, 'aws', [
      { name: 'pkg', policyTemplates: ['tpl'] },
    ]);

    expect(result).toEqual({ integrations: [], skipped: ['pkg'] });
  });
});

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

import {
  getCloudConnectorIntegrationSelections,
  mergeIntegrationSelections,
} from './iac_integrations';

jest.mock('../app_context');

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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../common/constants';
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
  const policy = (packageName: string | undefined, templateName: string, inputType = 'in') => ({
    attributes: {
      ...(packageName ? { package: { name: packageName } } : {}),
      inputs: [{ type: inputType, enabled: true, policy_template: templateName }],
    },
  });

  /** A point-in-time finder over fixed pages that records how many pages were handed out. */
  const finderFor = (pages: unknown[][]) => {
    const finder = {
      pagesYielded: 0,
      async *find() {
        for (const page of pages) {
          finder.pagesYielded += 1;
          yield { saved_objects: page };
        }
      },
      close: jest.fn(),
    };
    return finder;
  };

  const mockFinder = (pages: unknown[][]) => {
    const finder = finderFor(pages);
    soClient.createPointInTimeFinder.mockReturnValue(finder as any);
    return finder;
  };

  beforeEach(() => soClient.createPointInTimeFinder.mockReset());

  it('derives the enabled input types per policy template from the policies on the connector', async () => {
    const finder = mockFinder([
      [
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
        policy('aws', 'guardduty', 'aws-cloudwatch'),
        policy(undefined, 'orphan', 'aws-s3'),
      ],
    ]);

    const result = await getCloudConnectorIntegrationSelections(soClient, 'cc-1');

    expect(result).toEqual({
      integrations: [
        {
          name: 'aws',
          policyTemplates: [
            { name: 'cloudtrail', enabledInputs: ['aws-s3'] },
            { name: 'guardduty', enabledInputs: ['aws-cloudwatch'] },
          ],
        },
      ],
      exceedsCap: false,
    });
    expect(soClient.createPointInTimeFinder).toHaveBeenCalledWith(
      expect.objectContaining({
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        perPage: expect.any(Number),
        fields: ['package.name', 'inputs.type', 'inputs.enabled', 'inputs.policy_template'],
        filter: expect.stringContaining('cloud_connector_id:"cc-1"'),
      })
    );
    const { filter } = soClient.createPointInTimeFinder.mock.calls[0][0];
    expect(filter).toContain(
      `NOT ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.package.name:"${VERIFIER_PKG_NAME}"`
    );
    expect(filter).toContain('attributes.latest_revision:true');
    expect(finder.close).toHaveBeenCalled();
  });

  it('merges policies across pages into one sorted set', async () => {
    const finder = mockFinder([
      [
        policy('cloud_security_posture', 'cspm', 'cloudbeat/cis_aws'),
        policy('aws', 's3', 'aws-s3'),
      ],
      [policy('aws', 's3', 'aws-cloudwatch'), policy('aws', 'cloudtrail', 'aws-s3')],
    ]);

    const result = await getCloudConnectorIntegrationSelections(soClient, 'cc-1', {
      maxPackages: 2,
    });

    expect(result).toEqual({
      integrations: [
        {
          name: 'aws',
          policyTemplates: [
            { name: 'cloudtrail', enabledInputs: ['aws-s3'] },
            { name: 's3', enabledInputs: ['aws-cloudwatch', 'aws-s3'] },
          ],
        },
        {
          name: 'cloud_security_posture',
          policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
        },
      ],
      exceedsCap: false,
    });
    expect(finder.pagesYielded).toBe(2);
    expect(finder.close).toHaveBeenCalled();
  });

  it('stops reading and reports exceedsCap once more packages than the cap are seen', async () => {
    const finder = mockFinder([
      [policy('pkg_a', 'tpl'), policy('pkg_b', 'tpl'), policy('pkg_c', 'tpl')],
      [policy('pkg_d', 'tpl')],
    ]);

    const result = await getCloudConnectorIntegrationSelections(soClient, 'cc-1', {
      maxPackages: 2,
    });

    expect(result).toEqual({ integrations: [], exceedsCap: true });
    expect(finder.pagesYielded).toBe(1);
    expect(finder.close).toHaveBeenCalled();
  });

  it('returns an empty set when the connector has no policies', async () => {
    mockFinder([[]]);
    expect(await getCloudConnectorIntegrationSelections(soClient, 'cc-1')).toEqual({
      integrations: [],
      exceedsCap: false,
    });
  });

  it('escapes quotes in the connector id so it cannot break out of the KQL phrase', async () => {
    mockFinder([[]]);
    await getCloudConnectorIntegrationSelections(soClient, 'cc-1" or attributes.name:*');
    const { filter } = soClient.createPointInTimeFinder.mock.calls[0][0];
    expect(filter).toContain('cloud_connector_id:"cc-1\\" or attributes.name:*"');
  });

  it('drops a policy whose inputs are all disabled', async () => {
    mockFinder([
      [
        {
          attributes: {
            package: { name: 'aws' },
            inputs: [{ type: 'aws-s3', enabled: false, policy_template: 's3' }],
          },
        },
      ],
    ]);
    expect(await getCloudConnectorIntegrationSelections(soClient, 'cc-1')).toEqual({
      integrations: [],
      exceedsCap: false,
    });
  });
});

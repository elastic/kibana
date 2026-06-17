/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { getPackagePoliciesCountByPackageName } from './package_policies_aggregation';

// The mock resolves to the legacy (non-space-aware) type, matching a self-managed deployment.
const MOCKED_SO_TYPE = 'ingest-package-policies';

jest.mock('../package_policy', () => ({
  getPackagePolicySavedObjectType: jest.fn().mockResolvedValue('ingest-package-policies'),
}));

describe('getPackagePoliciesCountByPackageName', () => {
  it('uses NOT latest_revision:false filter so policies without the field are included', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValue({
      page: 1,
      per_page: 0,
      total: 0,
      saved_objects: [],
      aggregations: {
        count_by_package_name: { buckets: [] },
      },
    });

    await getPackagePoliciesCountByPackageName(soClient);

    expect(soClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: `NOT ${MOCKED_SO_TYPE}.attributes.latest_revision:false`,
      })
    );
  });

  it('includes a size parameter in the terms aggregation to avoid ES default truncation at 10 buckets', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValue({
      page: 1,
      per_page: 0,
      total: 0,
      saved_objects: [],
      aggregations: {
        count_by_package_name: { buckets: [] },
      },
    });

    await getPackagePoliciesCountByPackageName(soClient);

    expect(soClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        aggs: expect.objectContaining({
          count_by_package_name: expect.objectContaining({
            terms: expect.objectContaining({
              size: expect.any(Number),
            }),
          }),
        }),
      })
    );
    const [[callArgs]] = soClient.find.mock.calls;
    const termsSize = (callArgs.aggs as any)?.count_by_package_name?.terms?.size;
    expect(termsSize).toBeGreaterThan(10);
  });

  it('returns a map of package name to count', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValue({
      page: 1,
      per_page: 0,
      total: 3,
      saved_objects: [],
      aggregations: {
        count_by_package_name: {
          buckets: [
            { key: 'nginx', doc_count: 2 },
            { key: 'system', doc_count: 1 },
          ],
        },
      },
    });

    const result = await getPackagePoliciesCountByPackageName(soClient);

    expect(result).toEqual({ nginx: 2, system: 1 });
  });

  it('returns an empty object when there are no buckets', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValue({
      page: 1,
      per_page: 0,
      total: 0,
      saved_objects: [],
      aggregations: {
        count_by_package_name: { buckets: [] },
      },
    });

    const result = await getPackagePoliciesCountByPackageName(soClient);

    expect(result).toEqual({});
  });

  it('returns an empty object when aggregations are absent', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValue({
      page: 1,
      per_page: 0,
      total: 0,
      saved_objects: [],
    });

    const result = await getPackagePoliciesCountByPackageName(soClient);

    expect(result).toEqual({});
  });
});

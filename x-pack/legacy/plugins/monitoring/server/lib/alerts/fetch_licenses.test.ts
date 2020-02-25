/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { fetchLicenses } from './fetch_licenses';

describe('fetchLicenses', () => {
  it('return a list of licenses', async () => {
    const clusterName = 'MyCluster';
    const clusterUuid = 'clusterA';
    const license = {
      status: 'active',
      expiry_date_in_millis: 1579532493876,
      type: 'basic',
    };
    const callCluster = jest.fn().mockImplementation(() => ({
      hits: {
        hits: [
          {
            _source: {
              license,
              cluster_name: clusterName,
              cluster_uuid: clusterUuid,
            },
          },
        ],
      },
    }));
    const clusters = [{ clusterUuid }];
    const index = '.monitoring-es-*';
    const result = await fetchLicenses(callCluster, clusters, index);
    expect(result).toEqual([
      {
        status: license.status,
        type: license.type,
        expiryDateMS: license.expiry_date_in_millis,
        clusterUuid,
        clusterName,
      },
    ]);
  });

  it('should only search for the clusters provided', async () => {
    const clusterUuid = 'clusterA';
    const callCluster = jest.fn();
    const clusters = [{ clusterUuid }];
    const index = '.monitoring-es-*';
    await fetchLicenses(callCluster, clusters, index);
    const params = callCluster.mock.calls[0][1];
    expect(params.body.query.bool.filter[0].terms.cluster_uuid).toEqual([clusterUuid]);
  });

  it('should limit the time period in the query', async () => {
    const clusterUuid = 'clusterA';
    const callCluster = jest.fn();
    const clusters = [{ clusterUuid }];
    const index = '.monitoring-es-*';
    await fetchLicenses(callCluster, clusters, index);
    const params = callCluster.mock.calls[0][1];
    expect(params.body.query.bool.filter[2].range.timestamp.gte).toBe('now-2m');
  });

  it('should give priority to the metadata name', async () => {
    const clusterName = 'MyCluster';
    const clusterUuid = 'clusterA';
    const license = {
      status: 'active',
      expiry_date_in_millis: 1579532493876,
      type: 'basic',
    };
    const callCluster = jest.fn().mockImplementation(() => ({
      hits: {
        hits: [
          {
            _source: {
              license,
              cluster_name: 'fakeName',
              cluster_uuid: clusterUuid,
              cluster_settings: {
                cluster: {
                  metadata: {
                    display_name: clusterName,
                  },
                },
              },
            },
          },
        ],
      },
    }));
    const clusters = [{ clusterUuid }];
    const index = '.monitoring-es-*';
    const result = await fetchLicenses(callCluster, clusters, index);
    expect(result).toEqual([
      {
        status: license.status,
        type: license.type,
        expiryDateMS: license.expiry_date_in_millis,
        clusterUuid,
        clusterName,
      },
    ]);
  });
});

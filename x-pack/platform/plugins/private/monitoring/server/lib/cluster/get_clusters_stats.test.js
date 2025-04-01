/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleClusterStats } from './get_clusters_stats';

describe('handleClusterStats', () => {
  // valid license requires a cluster UUID of "12" for the hkey to match
  const validLicenseClusterUuid = '12';
  const validLicense = {
    status: 'status',
    uid: '1234',
    type: 'basic',
    expiry_date_in_millis: '1468601237000',
  };

  it('handles no response by returning an empty array', () => {
    expect(handleClusterStats()).toEqual([]);
    expect(handleClusterStats(null)).toEqual([]);
    expect(handleClusterStats({})).toEqual([]);
    expect(handleClusterStats({ hits: { total: 0 } })).toEqual([]);
    expect(handleClusterStats({ hits: { hits: [] } })).toEqual([]);
    // no _source means we can't use it:
    expect(handleClusterStats({ hits: { hits: [{}] } })).toEqual([]);
    expect(handleClusterStats({ hits: { hits: [{ _index: '.monitoring' }] } })).toEqual([]);
  });

  it('handles ccs response by adding it to the cluster detail', () => {
    const response = {
      hits: {
        hits: [
          {
            _index: 'cluster_one:.monitoring-es-2017.07.26',
            _source: {
              // missing license
              cluster_uuid: 'xyz',
            },
          },
        ],
      },
    };

    const clusters = handleClusterStats(response);

    expect(clusters.length).toEqual(1);
    expect(clusters[0].ccs).toEqual('cluster_one');
    expect(clusters[0].cluster_uuid).toEqual('xyz');
    expect(clusters[0].license).toBe(undefined);
  });

  it('handles invalid license', () => {
    const response = {
      hits: {
        hits: [
          {
            _index: '.monitoring-es-2017.07.26',
            _source: {
              // the cluster UUID is not valid with the license
              cluster_uuid: 'xyz',
              license: validLicense,
            },
          },
        ],
      },
    };

    const clusters = handleClusterStats(response);

    expect(clusters.length).toEqual(1);
    expect(clusters[0].ccs).toBe(undefined);
    expect(clusters[0].cluster_uuid).toEqual('xyz');
    expect(clusters[0].license).toBe(validLicense);
  });

  it('handles valid license', () => {
    const response = {
      hits: {
        hits: [
          {
            _index: '.monitoring-es-2017.07.26',
            _source: {
              cluster_uuid: validLicenseClusterUuid,
              license: validLicense,
            },
          },
        ],
      },
    };

    const clusters = handleClusterStats(response);

    expect(clusters.length).toEqual(1);
    expect(clusters[0].ccs).toBe(undefined);
    expect(clusters[0].cluster_uuid).toBe(validLicenseClusterUuid);
    expect(clusters[0].license).toBe(validLicense);
  });

  it('handles multiple clusters', () => {
    const response = {
      hits: {
        hits: [
          {
            _index: '.monitoring-es-2017.07.26',
            _source: {
              cluster_uuid: validLicenseClusterUuid,
              license: validLicense,
            },
          },
          // fake hit with no _source; should be filtered out
          {},
          // fake hit with no _source, but an index; should be filtered out
          {
            _index: 'bogus',
          },
          {
            _index: 'abc:.monitoring-es-2017.07.26',
            _source: {
              // the cluster UUID is not valid with the license
              cluster_uuid: 'xyz',
              license: validLicense,
            },
          },
          {
            _index: 'local_cluster:.monitoring-es-2017.07.26',
            _source: {
              cluster_uuid: validLicenseClusterUuid,
              license: validLicense,
            },
          },
        ],
      },
    };

    const clusters = handleClusterStats(response);

    expect(clusters.length).toEqual(3);
    expect(clusters[0].ccs).toBe(undefined);
    expect(clusters[0].cluster_uuid).toBe(validLicenseClusterUuid);
    expect(clusters[0].license).toBe(validLicense);
    expect(clusters[1].ccs).toEqual('abc');
    expect(clusters[1].cluster_uuid).toEqual('xyz');
    expect(clusters[1].license).toBe(validLicense);
    expect(clusters[2].ccs).toEqual('local_cluster');
    expect(clusters[2].cluster_uuid).toBe(validLicenseClusterUuid);
    expect(clusters[2].license).toBe(validLicense);
  });
});

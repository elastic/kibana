/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { handleClusterStats } from '../get_clusters_stats';

describe('handleClusterStats', () => {
  // valid license requires a cluster UUID of "12" for the hkey to match
  const validLicenseClusterUuid = '12';
  const validLicense = {
    status: 'status',
    uid: '1234',
    type: 'basic',
    expiry_date_in_millis: '1468601237000'
  };

  it('handles no response by returning an empty array', () => {
    expect(handleClusterStats()).to.eql([]);
    expect(handleClusterStats(null)).to.eql([]);
    expect(handleClusterStats({})).to.eql([]);
    expect(handleClusterStats({ hits: { total: 0 } })).to.eql([]);
    expect(handleClusterStats({ hits: { hits: [] } })).to.eql([]);
    // no _source means we can't use it:
    expect(handleClusterStats({ hits: { hits: [ { } ] } })).to.eql([]);
    expect(handleClusterStats({ hits: { hits: [ { '_index': '.monitoring' } ] } })).to.eql([]);
  });

  it('handles ccs response by adding it to the cluster detail', () => {
    const response = {
      hits: {
        hits: [
          {
            _index: 'cluster_one:.monitoring-es-2017.07.26',
            _source: {
              // missing license
              cluster_uuid: 'xyz'
            }
          }
        ]
      }
    };

    const clusters = handleClusterStats(response, { log: () => undefined });

    expect(clusters.length).to.eql(1);
    expect(clusters[0].ccs).to.eql('cluster_one');
    expect(clusters[0].cluster_uuid).to.eql('xyz');
    expect(clusters[0].license).to.be(undefined);
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
              license: validLicense
            }
          }
        ]
      }
    };

    const clusters = handleClusterStats(response);

    expect(clusters.length).to.eql(1);
    expect(clusters[0].ccs).to.be(undefined);
    expect(clusters[0].cluster_uuid).to.eql('xyz');
    expect(clusters[0].license).to.be(validLicense);
  });

  it('handles valid license', () => {
    const response = {
      hits: {
        hits: [
          {
            _index: '.monitoring-es-2017.07.26',
            _source: {
              cluster_uuid: validLicenseClusterUuid,
              license: validLicense
            }
          }
        ]
      }
    };

    const clusters = handleClusterStats(response);

    expect(clusters.length).to.eql(1);
    expect(clusters[0].ccs).to.be(undefined);
    expect(clusters[0].cluster_uuid).to.be(validLicenseClusterUuid);
    expect(clusters[0].license).to.be(validLicense);
  });

  it('handles multiple clusters', () => {
    const response = {
      hits: {
        hits: [
          {
            _index: '.monitoring-es-2017.07.26',
            _source: {
              cluster_uuid: validLicenseClusterUuid,
              license: validLicense
            }
          },
          // fake hit with no _source; should be filtered out
          {},
          // fake hit with no _source, but an index; should be filtered out
          {
            _index: 'bogus'
          },
          {
            _index: 'abc:.monitoring-es-2017.07.26',
            _source: {
              // the cluster UUID is not valid with the license
              cluster_uuid: 'xyz',
              license: validLicense
            }
          },
          {
            _index: 'local_cluster:.monitoring-es-2017.07.26',
            _source: {
              cluster_uuid: validLicenseClusterUuid,
              license: validLicense
            }
          }
        ]
      }
    };

    const clusters = handleClusterStats(response);

    expect(clusters.length).to.eql(3);
    expect(clusters[0].ccs).to.be(undefined);
    expect(clusters[0].cluster_uuid).to.be(validLicenseClusterUuid);
    expect(clusters[0].license).to.be(validLicense);
    expect(clusters[1].ccs).to.eql('abc');
    expect(clusters[1].cluster_uuid).to.eql('xyz');
    expect(clusters[1].license).to.be(validLicense);
    expect(clusters[2].ccs).to.eql('local_cluster');
    expect(clusters[2].cluster_uuid).to.be(validLicenseClusterUuid);
    expect(clusters[2].license).to.be(validLicense);
  });
});

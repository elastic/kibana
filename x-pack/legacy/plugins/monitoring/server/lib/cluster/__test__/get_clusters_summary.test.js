/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import clusters from './fixtures/clusters';
import { getClustersSummary } from '../get_clusters_summary';

const mockLog = jest.fn();
const mockServer = {
  log: mockLog,
};

describe('getClustersSummary', () => {
  it('should summarize cluster data with a primary cluster', () => {
    const kibanaUuid = '46205c28-9d41-447a-a438-c8b86fb5d1ce';
    const result = getClustersSummary(mockServer, clusters, kibanaUuid);
    expect(result).toMatchSnapshot();
  });

  it('should summarize cluster data with no primary cluster', () => {
    const kibanaUuid = null;
    const result = getClustersSummary(mockServer, clusters, kibanaUuid);
    expect(result).toMatchSnapshot();
  });

  it('should log and throw an exception if a cluster does not have a license', () => {
    const fakeClusters = clusters.map(cluster => ({
      ...cluster,
      license: undefined,
    }));

    expect(() => getClustersSummary(mockServer, fakeClusters)).toThrow('Monitoring License Error');
    expect(mockLog).toHaveBeenCalledWith(
      ['error', 'monitoring'],
      "Could not find license information for cluster = 'Custom name'. " +
        "Please check the cluster's master node server logs for errors or warnings."
    );
  });
});

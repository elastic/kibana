/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { checkClusterSettings } from '../';

describe('Elasticsearch Cluster Settings', () => {
  const makeResponse = (property, response = {}) => {
    const result = {
      persistent: {},
      transient: {},
      defaults: {},
    };
    result[property] = response;
    return result;
  };

  const getReq = response => {
    return {
      server: {
        newPlatform: {
          setup: {
            plugins: {
              cloud: {
                isCloudEnabled: false,
              },
            },
          },
        },
        plugins: {
          elasticsearch: {
            getCluster() {
              return {
                callWithRequest: () => Promise.resolve(response),
              };
            },
          },
        },
      },
    };
  };

  it('should return { found: false } given no response from ES', async () => {
    const mockReq = getReq(makeResponse('ignore', {}));
    const result = await checkClusterSettings(mockReq);
    expect(result).to.eql({ found: false });
  });

  it('should find default collection interval reason', async () => {
    const setting = {
      xpack: { monitoring: { collection: { interval: -1 } } },
    };
    const makeExpected = source => ({
      found: true,
      reason: {
        context: `cluster ${source}`,
        data: '-1',
        isCloudEnabled: false,
        property: 'xpack.monitoring.collection.interval',
      },
    });

    let mockReq;
    let result;

    mockReq = getReq(makeResponse('persistent', setting));
    result = await checkClusterSettings(mockReq);
    expect(result).to.eql(makeExpected('persistent'));

    mockReq = getReq(makeResponse('transient', setting));
    result = await checkClusterSettings(mockReq);
    expect(result).to.eql(makeExpected('transient'));

    mockReq = getReq(makeResponse('defaults', setting));
    result = await checkClusterSettings(mockReq);
    expect(result).to.eql(makeExpected('defaults'));
  });

  it('should find exporters reason', async () => {
    const setting = {
      xpack: { monitoring: { exporters: { myCoolExporter: {} } } },
    };
    const makeExpected = source => ({
      found: true,
      reason: {
        context: `cluster ${source}`,
        data: 'Remote exporters indicate a possible misconfiguration: myCoolExporter',
        isCloudEnabled: false,
        property: 'xpack.monitoring.exporters',
      },
    });

    let mockReq;
    let result;

    mockReq = getReq(makeResponse('persistent', setting));
    result = await checkClusterSettings(mockReq);
    expect(result).to.eql(makeExpected('persistent'));

    mockReq = getReq(makeResponse('transient', setting));
    result = await checkClusterSettings(mockReq);
    expect(result).to.eql(makeExpected('transient'));

    mockReq = getReq(makeResponse('defaults', setting));
    result = await checkClusterSettings(mockReq);
    expect(result).to.eql(makeExpected('defaults'));
  });

  it('should find enabled reason', async () => {
    const setting = {
      xpack: { monitoring: { enabled: 'false' } },
    };
    const makeExpected = source => ({
      found: true,
      reason: {
        context: `cluster ${source}`,
        data: 'false',
        isCloudEnabled: false,
        property: 'xpack.monitoring.enabled',
      },
    });

    let mockReq;
    let result;

    mockReq = getReq(makeResponse('persistent', setting));
    result = await checkClusterSettings(mockReq);
    expect(result).to.eql(makeExpected('persistent'));

    mockReq = getReq(makeResponse('transient', setting));
    result = await checkClusterSettings(mockReq);
    expect(result).to.eql(makeExpected('transient'));

    mockReq = getReq(makeResponse('defaults', setting));
    result = await checkClusterSettings(mockReq);
    expect(result).to.eql(makeExpected('defaults'));
  });
});

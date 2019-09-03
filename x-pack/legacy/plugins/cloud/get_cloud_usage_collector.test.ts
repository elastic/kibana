/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import {
  createCollectorFetch,
  getCloudUsageCollector,
  KibanaHapiServer,
} from './get_cloud_usage_collector';

const CLOUD_ID_STAGING =
  'staging:dXMtZWFzdC0xLmF3cy5mb3VuZC5pbyRjZWM2ZjI2MWE3NGJmMjRjZTMzYmI4ODExYjg0Mjk0ZiRjNmMyY2E2ZDA0MjI0OWFmMGNjN2Q3YTllOTYyNTc0Mw==';
const CLOUD_ID =
  'dXMtZWFzdC0xLmF3cy5mb3VuZC5pbyRjZWM2ZjI2MWE3NGJmMjRjZTMzYmI4ODExYjg0Mjk0ZiRjNmMyY2E2ZDA0MjI0OWFmMGNjN2Q3YTllOTYyNTc0Mw==';

const getMockServer = (cloudId?: string) => ({
  usage: { collectorSet: { makeUsageCollector: sinon.stub() } },
  config() {
    return {
      get(path: string) {
        switch (path) {
          case 'xpack.cloud':
            return { id: cloudId };
          default:
            throw Error(`server.config().get(${path}) should not be called by this collector.`);
        }
      },
    };
  },
});

describe('Cloud usage collector', () => {
  describe('collector', () => {
    it('returns `isCloudEnabled: false` if `xpack.cloud.id` is not defined', async () => {
      const collector = await createCollectorFetch(getMockServer())();
      expect(collector.isCloudEnabled).toBe(false);
    });

    it('returns `isCloudEnabled: true` if `xpack.cloud.id` is defined', async () => {
      const stagingCollector = await createCollectorFetch(getMockServer(CLOUD_ID))();
      const collector = await createCollectorFetch(getMockServer(CLOUD_ID_STAGING))();
      expect(collector.isCloudEnabled).toBe(true);
      expect(stagingCollector.isCloudEnabled).toBe(true);
    });
  });
});

describe('getCloudUsageCollector', () => {
  it('returns calls `collectorSet.makeUsageCollector`', () => {
    const mockServer = getMockServer();
    getCloudUsageCollector((mockServer as any) as KibanaHapiServer);
    const { makeUsageCollector } = mockServer.usage.collectorSet;
    expect(makeUsageCollector.calledOnce).toBe(true);
  });
});

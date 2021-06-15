/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { ServiceStatus, ServiceStatusLevels } from '../../../../src/core/server';
import { FtrProviderContext } from '../../services/types';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const getStatus = async (pluginName: string): Promise<ServiceStatus> => {
    const resp = await supertest.get('/api/status?v8format=true');

    return resp.body.status.plugins[pluginName];
  };

  const setStatus = async <T extends keyof typeof ServiceStatusLevels>(level: T) =>
    supertest
      .post(`/internal/core_plugin_a/status/set?level=${level}`)
      .set('kbn-xsrf', 'xxx')
      .expect(200);

  describe('status service', () => {
    // This test must comes first because the timeout only applies to the initial emission
    it("returns a timeout for status check that doesn't emit after 30s", async () => {
      let aStatus = await getStatus('corePluginA');
      expect(aStatus.level).to.eql('unavailable');

      // Status will remain in unavailable due to core services until custom status timesout
      // Keep polling until that condition ends, up to a timeout
      const start = Date.now();
      while (aStatus.summary !== 'Status check timed out after 30s') {
        aStatus = await getStatus('corePluginA');

        // If it's been more than 40s, break out of this loop
        if (Date.now() - start >= 40_000) {
          throw new Error(`Timed out waiting for status timeout after 40s`);
        }

        log.info('Waiting for status check to timeout...');
        await delay(2000);
      }

      expect(aStatus.level).to.eql('unavailable');
      expect(aStatus.summary).to.eql('Status check timed out after 30s');
    });

    it('propagates status issues to dependencies', async () => {
      await setStatus('degraded');
      await delay(1000);
      expect((await getStatus('corePluginA')).level).to.eql('degraded');
      expect((await getStatus('corePluginB')).level).to.eql('degraded');

      await setStatus('available');
      await delay(1000);
      expect((await getStatus('corePluginA')).level).to.eql('available');
      expect((await getStatus('corePluginB')).level).to.eql('available');
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import type { ServiceStatus, ServiceStatusLevels } from '@kbn/core/server';
import { FtrProviderContext } from '../../services/types';

type ServiceStatusSerialized = Omit<ServiceStatus, 'level'> & { level: string };

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');

  const getStatus = async (pluginName: string): Promise<ServiceStatusSerialized> => {
    const resp = await supertest.get('/api/status');

    return resp.body.status.plugins[pluginName];
  };

  // max debounce of the status observable + 1
  const statusPropagation = () => new Promise((resolve) => setTimeout(resolve, 501));

  const setStatus = async <T extends keyof typeof ServiceStatusLevels>(level: T) =>
    supertest
      .post(`/internal/status_plugin_a/status/set?level=${level}`)
      .set('kbn-xsrf', 'xxx')
      .expect(200);

  describe('status service', () => {
    // This test must comes first because the timeout only applies to the initial emission
    it("returns a timeout for status check that doesn't emit after 30s", async () => {
      let aStatus = await getStatus('statusPluginA');
      expect(aStatus.level).to.eql('unavailable');

      // Status will remain in unavailable until the custom status check times out
      // Keep polling until that condition ends, up to a timeout
      await retry.waitForWithTimeout(`Status check to timeout`, 40_000, async () => {
        aStatus = await getStatus('statusPluginA');
        return aStatus.summary === 'Status check timed out after 30s';
      });

      expect(aStatus.level).to.eql('unavailable');
      expect(aStatus.summary).to.eql('Status check timed out after 30s');
    });

    it('propagates status issues to dependencies', async () => {
      await setStatus('degraded');
      await retry.waitForWithTimeout(
        `statusPluginA status to update`,
        5_000,
        async () => (await getStatus('statusPluginA')).level === 'degraded'
      );
      await statusPropagation();
      expect((await getStatus('statusPluginA')).level).to.eql('degraded');
      expect((await getStatus('statusPluginB')).level).to.eql('degraded');

      await setStatus('available');
      await retry.waitForWithTimeout(
        `statusPluginA status to update`,
        5_000,
        async () => (await getStatus('statusPluginA')).level === 'available'
      );
      await statusPropagation();
      expect((await getStatus('statusPluginA')).level).to.eql('available');
      expect((await getStatus('statusPluginB')).level).to.eql('available');
    });
  });
}

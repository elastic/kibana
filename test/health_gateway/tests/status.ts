/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from './ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const healthGateway = getService('healthGateway');

  describe('status API', () => {
    afterEach(async () => {
      await healthGateway.stop();
    });

    ['/', '/api/status'].forEach((path) => {
      describe(`${path}`, () => {
        it('returns 200 on healthy hosts', async () => {
          await healthGateway.start('fixtures/healthy.yaml');

          const { body } = await healthGateway.poll(path).expect(200);
          expect(body).to.have.property('status', 'healthy');
        });

        it('returns 503 on unhealthy host', async () => {
          await healthGateway.start('fixtures/unhealthy.yaml');

          const { body } = await healthGateway.poll(path).expect(503);
          expect(body).to.have.property('status', 'unhealthy');
        });

        it('returns 503 on mixed responses', async () => {
          await healthGateway.start('fixtures/mixed.yaml');

          const { body } = await healthGateway.poll(path).expect(503);
          expect(body).to.have.property('status', 'unhealthy');
        });

        it('returns 504 on timeout', async () => {
          await healthGateway.start('fixtures/timeout.yaml');

          const { body } = await healthGateway.poll(path).expect(504);
          expect(body).to.have.property('status', 'timeout');
        });

        it('returns 502 on exception', async () => {
          await healthGateway.start('fixtures/invalid.yaml');

          const { body } = await healthGateway.poll(path).expect(502);
          expect(body).to.have.property('status', 'failure');
        });

        it('returns different status codes on state changes', async () => {
          await healthGateway.start('fixtures/flaky.yaml', {
            env: { SESSION: `${Math.random()}` },
          });

          await healthGateway.poll(path).expect(200);
          await healthGateway.poll(path).expect(503);
          await healthGateway.poll(path).expect(200);
        });
      });
    });
  });
}

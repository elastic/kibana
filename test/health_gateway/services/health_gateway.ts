/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';
import { format } from 'url';
import getPort from 'get-port';
import supertest from 'supertest';
import { ProcRunner } from '@kbn/dev-proc-runner';
import { REPO_ROOT } from '@kbn/utils';
import { FtrService } from '../../functional/ftr_provider_context';

interface HealthGatewayOptions {
  env?: Record<string, string>;
}

export class HealthGatewayService extends FtrService {
  private runner = new ProcRunner(this.ctx.getService('log'));
  private kibanaUrl = format(this.ctx.getService('config').get('servers.kibana'));
  private host = 'localhost';
  private port?: number;

  private assertRunning() {
    if (!this.port) {
      throw new Error('Health gateway is not running');
    }
  }

  async start(config: string, { env = {} }: HealthGatewayOptions = {}) {
    if (this.port) {
      throw new Error('Health gateway is already running');
    }

    this.port = await getPort({ port: getPort.makeRange(1024, 65536) });

    await this.runner.run(`health-gateway-${this.port}`, {
      cmd: 'yarn',
      args: [
        'kbn',
        'run-in-packages',
        '--filter=@kbn/health-gateway-server',
        'start',
        '--config',
        resolve(__dirname, '..', config),
      ],
      cwd: REPO_ROOT,
      env: {
        ...env,
        KIBANA_URL: this.kibanaUrl,
        HOST: this.host,
        PORT: `${this.port}`,
        CI: '', // Override in the CI environment to capture the logs.
      },
      wait: /Server is ready/,
    });
  }

  async stop() {
    this.assertRunning();

    await this.runner?.stop(`health-gateway-${this.port}`);
    this.port = undefined;
  }

  poll() {
    this.assertRunning();

    return supertest(`http://${this.host}:${this.port}`).get('/').send();
  }
}

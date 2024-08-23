/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { Agent } from 'https';
import fetch from 'node-fetch';
import { getUrl } from '@kbn/test';

import { FtrService } from '../ftr_provider_context';

export class DeploymentService extends FtrService {
  private readonly config = this.ctx.getService('config');

  /**
   * Returns Kibana host URL
   */
  getHostPort() {
    return getUrl.baseUrl(this.config.get('servers.kibana'));
  }

  /**
   * Returns ES host URL
   */
  getEsHostPort() {
    return getUrl.baseUrl(this.config.get('servers.elasticsearch'));
  }

  async isCloud(): Promise<boolean> {
    const baseUrl = this.getHostPort();
    const username = this.config.get('servers.kibana.username');
    const password = this.config.get('servers.kibana.password');
    const protocol = this.config.get('servers.kibana.protocol');

    let agent: Agent | undefined;
    if (protocol === 'https') {
      agent = new Agent({
        // required for self-signed certificates used for HTTPS FTR testing
        rejectUnauthorized: false,
      });
    }

    const response = await fetch(baseUrl + '/api/stats?extended', {
      method: 'get',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
      },
      agent,
    });
    const data = await response.json();
    return get(data, 'usage.cloud.is_cloud_enabled', false);
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { format as formatUrl } from 'url';

import supertestAsPromised from 'supertest-as-promised';

export function createKibanaSupertestProvider({ certificateAuthorities, kibanaUrl } = {}) {
  return function ({ getService }) {
    const config = getService('config');
    kibanaUrl = kibanaUrl ?? formatUrl(config.get('servers.kibana'));

    return certificateAuthorities
      ? supertestAsPromised.agent(kibanaUrl, { ca: certificateAuthorities })
      : supertestAsPromised(kibanaUrl);
  };
}

export function KibanaSupertestWithoutAuthProvider({ getService }) {
  const config = getService('config');
  const kibanaServerConfig = config.get('servers.kibana');

  return supertestAsPromised(
    formatUrl({
      ...kibanaServerConfig,
      auth: false,
    })
  );
}

export function ElasticsearchSupertestProvider({ getService }) {
  const config = getService('config');
  const elasticSearchServerUrl = formatUrl(config.get('servers.elasticsearch'));
  return supertestAsPromised(elasticSearchServerUrl);
}

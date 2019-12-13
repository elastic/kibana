/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { injectXPackInfoSignature } from './inject_xpack_info_signature';
import { XPackInfo } from './xpack_info';

/**
 * Setup the X-Pack Main plugin. This is fired every time that the Elasticsearch plugin becomes Green.
 *
 * This will ensure that X-Pack is installed on the Elasticsearch cluster, as well as trigger the initial
 * polling for _xpack/info.
 *
 * @param server {Object} The Kibana server object.
 */
export function setupXPackMain(server) {
  const info = new XPackInfo(server, {
    pollFrequencyInMillis: server
      .config()
      .get('xpack.xpack_main.xpack_api_polling_frequency_millis'),
  });

  server.expose('info', info);
  server.expose('createXPackInfo', options => new XPackInfo(server, options));
  server.ext('onPreResponse', (request, h) => injectXPackInfoSignature(info, request, h));

  const { registerFeature, getFeatures } = server.newPlatform.setup.plugins.features;
  server.expose('registerFeature', registerFeature);
  server.expose('getFeatures', getFeatures);

  const setPluginStatus = () => {
    if (info.isAvailable()) {
      server.plugins.xpack_main.status.green('Ready');
    } else {
      server.plugins.xpack_main.status.red(info.unavailableReason());
    }
  };

  // trigger an xpack info refresh whenever the elasticsearch plugin status changes
  server.plugins.elasticsearch.status.on('change', async () => {
    await info.refreshNow();
    setPluginStatus();
  });

  // whenever the license info is updated, regardless of the elasticsearch plugin status
  // changes, reflect the change in our plugin status. See https://github.com/elastic/kibana/issues/20017
  info.onLicenseInfoChange(setPluginStatus);

  return info;
}

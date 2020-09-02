/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pairwise } from 'rxjs/operators';
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
  const info = new XPackInfo(server, { licensing: server.newPlatform.setup.plugins.licensing });

  server.expose('info', info);

  // trigger an xpack info refresh whenever the elasticsearch plugin status changes
  server.newPlatform.setup.core.status.core$
    .pipe(pairwise())
    .subscribe(async ([coreLast, coreCurrent]) => {
      if (coreLast.elasticsearch.level !== coreCurrent.elasticsearch.level) {
        await info.refreshNow();
      }
    });

  return info;
}

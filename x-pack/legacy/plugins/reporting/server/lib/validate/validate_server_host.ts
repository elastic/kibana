/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerFacade } from '../../../types';

const configKey = 'xpack.reporting.kibanaServer.hostname';

export function validateServerHost(serverFacade: ServerFacade) {
  const config = serverFacade.config();

  const serverHost = config.get('server.host');
  const reportingKibanaHostName = config.get(configKey);

  if (!reportingKibanaHostName && serverHost === '0') {
    // @ts-ignore: No set() method on KibanaConfig, just get() and has()
    config.set(configKey, '0.0.0.0'); // update config in memory to allow Reporting to work

    throw new Error(
      `Found 'server.host: "0"' in settings. This is incompatible with Reporting. ` +
        `To enable Reporting to work, '${configKey}: 0.0.0.0' is being automatically to the configuration. ` +
        `You can change to 'server.host: 0.0.0.0' or add '${configKey}: 0.0.0.0' in kibana.yml to prevent this message.`
    );
  }
}

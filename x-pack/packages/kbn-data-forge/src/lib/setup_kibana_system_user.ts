/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { Client } from '@elastic/elasticsearch';
import { elasticsearchErrorHandler } from './elasticsearch_error_handler';
import { Config } from '../types';

export async function setupKibanaSystemUser(config: Config, client: Client, logger: ToolingLog) {
  await client.security
    .changePassword({ username: 'kibana_system', body: { password: 'changeme' } })
    .then(() => {
      logger.info('Password changed to "changeme" for "kibana_system" user');
    })
    .catch(
      elasticsearchErrorHandler(
        () => setupKibanaSystemUser(config, client, logger),
        client,
        logger,
        true
      )
    );
  return;
}

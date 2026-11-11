/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEsClient, createKbnClient } from '../cases_generator/clients';
import { logger } from '../cases_generator/logger';
import { createRequester } from '../observables_load_test/shared';
import { parseConfig } from './config';
import { runSnapshot } from './snapshot';
import { runWatch } from './watch';

const main = async (): Promise<void> => {
  const config = parseConfig();
  const { kibana, elasticsearch, username, password, esUsername, esPassword } = config;
  const es = createEsClient({
    node: elasticsearch,
    ssl: elasticsearch.startsWith('https:'),
    username: esUsername,
    password: esPassword,
  });
  const request = createRequester(
    createKbnClient({ url: kibana, username, password, ssl: kibana.startsWith('https:') })
  );

  if (config.mode === 'watch') {
    await runWatch(es, request, config);
  } else {
    await runSnapshot(es, config.reads ? request : undefined, config);
  }
};

main().catch((error) => {
  logger.error(error);
  process.exitCode = 1;
});

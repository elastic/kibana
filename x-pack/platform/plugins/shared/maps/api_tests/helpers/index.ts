/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutLogger, ApiTest } from '@kbn/scout-api-tests';

export const unload = async ({
  esArchiver,
  kbnClient,
  log,
}: Pick<ApiTest, 'esArchiver' | 'kbnClient' | 'log'>) => {
  await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
  await kbnClient.importExport.unload('x-pack/test/functional/fixtures/kbn_archiver/maps.json');
  await esArchiver.unload('x-pack/test/functional/es_archives/maps/data');

  log.debug('### All data UN-loaded');
};
export const logError = (log: ScoutLogger) => (e: any) => {
  log.debug(e?.result);
  log.debug(e?.result?.errors);
};

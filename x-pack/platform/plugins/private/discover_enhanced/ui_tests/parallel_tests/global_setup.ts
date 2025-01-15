/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutTestOptions } from '@kbn/scout';
import {
  createEsArchiver,
  createEsClient,
  createKbnClient,
  createLogger,
  createScoutConfig,
} from '@kbn/scout/src/common';
import { type FullConfig } from '@playwright/test';
import { testData } from '../fixtures';

async function globalSetup(config: FullConfig) {
  const log = createLogger();
  const configName = 'local';
  const projectUse = config.projects[0].use as ScoutTestOptions;
  const serversConfigDir = projectUse.serversConfigDir;
  const scoutConfig = createScoutConfig(serversConfigDir, configName, log);

  const esClient = createEsClient(scoutConfig, log);
  const kbnCLient = createKbnClient(scoutConfig, log);
  const esArchiver = createEsArchiver(esClient, kbnCLient, log);

  const archives = [
    testData.ES_ARCHIVES.LOGSTASH,
    testData.ES_ARCHIVES.NO_TIME_FIELD,
    testData.ES_ARCHIVES.ECOMMERCE,
  ];

  // Load archives
  log.info('Loading test data with esArchiver...');
  for (const archive of archives) {
    await esArchiver.loadIfNeeded(archive);
  }
  log.info('Test data loaded.');
}

// eslint-disable-next-line import/no-default-export
export default globalSetup;

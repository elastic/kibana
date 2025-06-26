/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchServiceStart, Logger, SavedObjectsClient } from '@kbn/core/server';

import { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { ReindexWorker } from '../../lib/reindexing';
import { CredentialStore } from '../../lib/reindexing/credential_store';

interface CreateReindexWorker {
  logger: Logger;
  elasticsearchService: ElasticsearchServiceStart;
  credentialStore: CredentialStore;
  savedObjects: SavedObjectsClient;
  licensing: LicensingPluginSetup;
  security: SecurityPluginStart;
}

export function createReindexWorker({
  logger,
  elasticsearchService,
  credentialStore,
  savedObjects,
  licensing,
  security,
}: CreateReindexWorker) {
  const esClient = elasticsearchService.client;
  return ReindexWorker.create(savedObjects, credentialStore, esClient, logger, licensing, security);
}

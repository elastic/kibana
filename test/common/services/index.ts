/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DeploymentProvider } from './deployment';
import { LegacyEsProvider } from './legacy_es';
import { ElasticsearchProvider } from './elasticsearch';
import { EsArchiverProvider } from './es_archiver';
import { KibanaServerProvider } from './kibana_server';
import { RetryProvider } from './retry';
import { RandomnessProvider } from './randomness';
import { SecurityServiceProvider } from './security';
import { EsDeleteAllIndicesProvider } from './es_delete_all_indices';

export const services = {
  deployment: DeploymentProvider,
  legacyEs: LegacyEsProvider,
  es: ElasticsearchProvider,
  esArchiver: EsArchiverProvider,
  kibanaServer: KibanaServerProvider,
  retry: RetryProvider,
  randomness: RandomnessProvider,
  security: SecurityServiceProvider,
  esDeleteAllIndices: EsDeleteAllIndicesProvider,
};

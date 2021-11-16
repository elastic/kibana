/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DeploymentService } from './deployment';
import { ElasticsearchProvider } from './elasticsearch';
import { EsArchiverProvider } from './es_archiver';
import { KibanaServerProvider } from './kibana_server';
import { RetryService } from './retry';
import { RandomnessService } from './randomness';
import { SecurityServiceProvider } from './security';
import { EsDeleteAllIndicesProvider } from './es_delete_all_indices';
import { SavedObjectInfoService } from './saved_object_info';
import { IndexPatternsService } from './index_patterns';
import { BSearchProvider } from './bsearch';

export const services = {
  deployment: DeploymentService,
  es: ElasticsearchProvider,
  esArchiver: EsArchiverProvider,
  kibanaServer: KibanaServerProvider,
  retry: RetryService,
  randomness: RandomnessService,
  security: SecurityServiceProvider,
  esDeleteAllIndices: EsDeleteAllIndicesProvider,
  savedObjectInfo: SavedObjectInfoService,
  indexPatterns: IndexPatternsService,
  bsearch: BSearchProvider,
};

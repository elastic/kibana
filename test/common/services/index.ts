/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { DeploymentService } from './deployment';
import { RandomnessService } from './randomness';
import { SecurityServiceProvider } from './security';
import { EsDeleteAllIndicesProvider } from './es_delete_all_indices';
import { SavedObjectInfoService } from './saved_object_info';
import { IndexPatternsService } from './index_patterns';
import { BsearchService } from './bsearch';

export const services = {
  ...commonFunctionalServices,
  deployment: DeploymentService,
  randomness: RandomnessService,
  security: SecurityServiceProvider,
  esDeleteAllIndices: EsDeleteAllIndicesProvider,
  savedObjectInfo: SavedObjectInfoService,
  indexPatterns: IndexPatternsService,
  bsearch: BsearchService,
};

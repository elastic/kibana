/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, ISavedObjectsRepository } from '@kbn/core/server';
import type { ActionType, ActionTypeConfig, ActionTypeParams, ActionTypeSecrets } from './types';

/** Shape of a connector type built from a spec; matches `createConnectorTypeFromSpec`. */
export type CatalogActionType = ActionType<
  ActionTypeConfig,
  ActionTypeSecrets,
  ActionTypeParams,
  unknown
>;

export interface CatalogSpecProviderDeps {
  esClient: ElasticsearchClient;
  /** Internal repository over the `action` saved object type, used to find pinned spec versions. */
  savedObjectsRepository: ISavedObjectsRepository;
}

/**
 * Supplies catalog-backed connector types at actions start. The provider builds the
 * `ActionType` objects itself so version dispatch stays inside the providing plugin.
 */
export interface CatalogSpecProvider {
  load(deps: CatalogSpecProviderDeps): Promise<CatalogActionType[]>;
}

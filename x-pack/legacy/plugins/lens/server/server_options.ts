/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, IRouter } from 'src/core/server';

export type ScopedSavedObjectsProvider = (request: unknown) => SavedObjectsClientContract;

export interface LensServerOptions {
  router: IRouter;
  getScopedSavedObjectsClient: ScopedSavedObjectsProvider;
}

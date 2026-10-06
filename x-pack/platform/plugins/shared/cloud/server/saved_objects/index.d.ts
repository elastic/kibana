/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  SavedObjectsClientContract,
  SavedObjectsServiceSetup,
} from '@kbn/core/server';
export declare const CLOUD_DATA_SAVED_OBJECT_TYPE: 'cloud';
export declare function setupSavedObjects(
  savedObjects: SavedObjectsServiceSetup,
  logger: Logger
): void;
export declare function getOnboardingToken(
  savedObjectsClient: SavedObjectsClientContract
): Promise<string | null>;

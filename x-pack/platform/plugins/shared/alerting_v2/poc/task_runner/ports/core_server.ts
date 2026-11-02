/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pod-build port: `@kbn/core/server`'s own package entry re-exports `@kbn/core-root-server-internal`
 * (full Core boot) even when a file only wants a pure helper like `isSavedObjectErrorResult` or
 * `SavedObjectsUtils`. Both live in small, Core-boot-free packages; re-exporting them directly lets
 * `rules_client.ts` / `rules_saved_object_service.ts` / `space_id_to_namespace.ts` keep their real,
 * unmodified imports while the pod avoids pulling in all of Core for two utility exports.
 */
export { isSavedObjectErrorResult } from '@kbn/core-saved-objects-common';
export { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
export { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';

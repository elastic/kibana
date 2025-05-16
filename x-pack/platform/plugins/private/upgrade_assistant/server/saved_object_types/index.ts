/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reindexOperationSavedObjectType } from './reindex_operation_saved_object_type';
import { mlSavedObjectType } from './ml_upgrade_operation_saved_object_type';

export { reindexOperationSavedObjectType } from './reindex_operation_saved_object_type';
export { mlSavedObjectType } from './ml_upgrade_operation_saved_object_type';
export const hiddenTypes = [reindexOperationSavedObjectType.name, mlSavedObjectType.name];

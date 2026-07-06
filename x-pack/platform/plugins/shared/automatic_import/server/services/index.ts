/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { AutomaticImportSamplesIndexService } from './samples_index/index_service';
export { AutomaticImportService } from './automatic_import_service';
export { TaskManagerService } from './task_manager/task_manager_service';
export { AutomaticImportSavedObjectService } from './saved_objects/saved_objects_service';

export { automaticImportSamplesIndexName as AutomaticImportSamplesIndexName } from './samples_index/storage';

export type { IntegrationAttributes, DataStreamAttributes } from './saved_objects/schemas/types';

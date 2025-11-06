/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogsSharedBackendLibs } from '../../lib/logs_shared_types';
import { initGetLogDocumentByIdRoute } from './get_log_document_by_id';

export const initLogRoutes = (libs: LogsSharedBackendLibs) => {
  initGetLogDocumentByIdRoute(libs);
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { createToken } from '@kbn/core-di';

export const EncryptedSavedObjectsClientToken = createToken<EncryptedSavedObjectsClient>(
  'alerting_v2.EncryptedSavedObjectsClient'
);

export const WorkflowsManagementApiToken = createToken<WorkflowsServerPluginSetup['management']>(
  'alerting_v2.WorkflowsManagementApi'
);

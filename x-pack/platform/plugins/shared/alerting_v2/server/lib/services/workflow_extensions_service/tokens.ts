/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';
import type { WorkflowsClient } from '@kbn/workflows/server/types';
import type { WorkflowExtensionsServiceContract } from './workflow_extensions_service';

export const WorkflowExtensionsServiceToken = Symbol.for(
  'alerting_v2.WorkflowExtensionsService'
) as ServiceIdentifier<WorkflowExtensionsServiceContract>;

export const WorkflowsClientToken = Symbol.for(
  'alerting_v2.WorkflowsClient'
) as ServiceIdentifier<WorkflowsClient>;

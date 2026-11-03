/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { createWorkflowTriggerEmitter } from '../../workflow/create_workflow_trigger_emitter';
import { CRUDClient } from './crud_client';
import type { EntityStoreStartContract } from '../../types';

/** The `createCRUDClient` of the start contract, which the workflow steps use too. */
export const createCRUDClientFactory =
  (logger: Logger): EntityStoreStartContract['createCRUDClient'] =>
  (esClient, namespace, getWorkflowsClient) => {
    const emitWorkflowTriggerEvent = getWorkflowsClient
      ? createWorkflowTriggerEmitter({
          getWorkflowsClient,
          logger,
          context: `namespace "${namespace}"`,
        })
      : undefined;
    return new CRUDClient({ logger, esClient, namespace, emitWorkflowTriggerEvent });
  };

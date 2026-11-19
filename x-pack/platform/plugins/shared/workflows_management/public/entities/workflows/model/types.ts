/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowYaml } from '@kbn/workflows';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';

/**
 * Map of workflow IDs to workflow details
 * Used for quick lookup of workflow names by ID
 */
export interface WorkflowsMap {
  [workflowId: string]: {
    id: string;
    name: string;
    managed?: boolean;
    inputsSchema?: JsonModelSchemaType;
    /** The outputs the workflow declares, as written in its definition. */
    outputs?: WorkflowYaml['outputs'];
    /** Names the workflow's `workflow.output` steps set; undefined when any field may come back. */
    returnedOutputNames?: string[];
  };
}

/**
 * Response from the workflows search API
 * Used for pre-loading workflows into Redux store
 */
export interface WorkflowsResponse {
  workflows: WorkflowsMap;
  totalWorkflows: number;
}

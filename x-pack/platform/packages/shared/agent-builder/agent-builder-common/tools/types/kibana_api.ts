/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDefinition } from '../definition';
import { ToolType } from '../definition';

/**
 * One allowlisted Kibana OpenAPI operation on a Kibana API tool. When
 * `workflow_connector_type` is set, execution uses @kbn/workflows `buildKibanaRequest`
 * with that connector; otherwise the raw `kibana.request` branch with method +
 * path_template + resolved params.
 */
export interface KibanaApiOperationConfig {
  operation_id: string;
  method: string;
  path_template: string;
  /** Present when this operation matches a generated workflow Kibana connector */
  workflow_connector_type: string | null;
}

/**
 * A Kibana API tool is a bundle of one or more documented REST operations. The model
 * must pass `operation_id` (see tool JSON Schema) to choose which operation to run,
 * then `path` / `query` / `body` as required for that operation.
 */
export interface KibanaApiToolConfig {
  operations: KibanaApiOperationConfig[];
}

export type KibanaApiToolDefinition = ToolDefinition<ToolType.kibana_api, KibanaApiToolConfig>;

export function isKibanaApiTool(
  tool: ToolDefinition<ToolType, object>
): tool is KibanaApiToolDefinition {
  return tool.type === ToolType.kibana_api;
}

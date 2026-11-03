/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateConnectorTypeRequest } from '@kbn/actions-plugin/common';

export const GENERATE_CONNECTOR_TYPE_PATH =
  '/internal/triggers_actions_ui/connector_types/_generate';

/** Feature Settings id for the model that drafts a connector type from documentation. */
export const CONNECTOR_BUILDER_INFERENCE_FEATURE_ID = 'connector_builder';

export type GenerateConnectorTypeErrorReason =
  | 'invalid_url'
  | 'blocked_destination'
  | 'fetch_failed'
  | 'unsupported_content'
  | 'too_large'
  | 'no_model'
  | 'model_error'
  | 'invalid_output';

export interface GenerateConnectorTypeRequest {
  url: string;
}

export interface GenerateConnectorTypeResponse {
  connectorType: CreateConnectorTypeRequest;
}

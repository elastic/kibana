/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SemanticConventions } from '@arizeai/openinference-semantic-conventions';
import { tracing } from '@elastic/opentelemetry-node/sdk';
import { ElasticGenAIAttributes } from '../types';

export function getExecuteToolSpan(span: tracing.ReadableSpan) {
  span.attributes[SemanticConventions.TOOL_PARAMETERS] =
    span.attributes[ElasticGenAIAttributes.ToolParameters];
  span.attributes[SemanticConventions.TOOL_DESCRIPTION] =
    span.attributes[ElasticGenAIAttributes.ToolDescription];

  return span;
}

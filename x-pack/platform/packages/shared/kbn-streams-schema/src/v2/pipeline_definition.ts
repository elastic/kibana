/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DisplayFields, Identifier, NonEmptyArray, StreamlangCondition } from './common';

export interface PipelineDefinitionStep extends Record<string, unknown> {
  action: string;
  where?: StreamlangCondition;
  ignore_failure?: boolean;
}

export interface PipelineDefinition extends DisplayFields {
  id: Identifier;
  steps: NonEmptyArray<PipelineDefinitionStep>;
}

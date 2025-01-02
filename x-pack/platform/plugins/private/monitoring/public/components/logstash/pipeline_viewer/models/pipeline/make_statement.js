/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginStatement } from './plugin_statement';
import { IfStatement } from './if_statement';
import { Queue } from './queue';

export function makeStatement(pipelineGraphVertex, pipelineStage) {
  switch (pipelineGraphVertex.typeString) {
    case 'plugin':
      return PluginStatement.fromPipelineGraphVertex(pipelineGraphVertex, pipelineStage);
    case 'if':
      return IfStatement.fromPipelineGraphVertex(pipelineGraphVertex, pipelineStage);
    case 'queue':
      return Queue.fromPipelineGraphVertex(pipelineGraphVertex, pipelineStage);
    default:
      throw new Error(`Unknown vertex class: ${pipelineGraphVertex.typeString}`);
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginStatement } from './plugin_statement';
import { IfStatement } from './if_statement';
import { Queue } from './queue';
import { SeparatorStatement } from './separator_statement';

export function makeStatement(pipelineGraphVertex, pipelineStage) {
  const klass = pipelineGraphVertex.constructor.name;
  switch (klass) {
    case 'PluginVertex':
      return PluginStatement.fromPipelineGraphVertex(pipelineGraphVertex, pipelineStage);
    case 'IfVertex':
      return IfStatement.fromPipelineGraphVertex(pipelineGraphVertex, pipelineStage);
    case 'QueueVertex':
      return Queue.fromPipelineGraphVertex(pipelineGraphVertex, pipelineStage);
    case 'SeparatorVertex':
      return SeparatorStatement.fromPipelineGraphVertex(pipelineGraphVertex, pipelineStage);
    default:
      throw new Error(`Unknown vertex class: ${klass}`);
  }
}

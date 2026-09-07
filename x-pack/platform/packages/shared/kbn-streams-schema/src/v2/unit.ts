/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DisplayFields, Identifier } from './common';
import type { Destination } from './destination';
import type { Pipeline } from './pipeline';
import type { PipelineDefinition } from './pipeline_definition';
import type { RoutingNode } from './routing_node';
import type { Source } from './source';

export interface UnitDefinition extends DisplayFields {
  id?: Identifier;
  sources: Source[];
  destinations: Destination[];
  pipelines: Pipeline[];
  pipeline_definitions: PipelineDefinition[];
  routing_nodes: RoutingNode[];
}

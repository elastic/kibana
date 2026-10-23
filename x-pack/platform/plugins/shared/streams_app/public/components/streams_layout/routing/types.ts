/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';

export type RoutingAction = NonNullable<StreamsUnit.PipelineRoute['action']>;

/** A component a routing rule forwards records to. */
export interface RoutingTarget {
  kind: 'destination' | 'pipeline';
  id: string;
}

export interface RoutingRuleViewModel {
  /** Position of the rule in the pipeline `routes` list. */
  index: number;
  /** OTTL condition. Undefined for a catch-all rule. */
  when?: string;
  action?: RoutingAction;
  targets: RoutingTarget[];
}

/** A pipeline that branches records, either through `routes` or as a routed child pipeline. */
export interface RoutingViewModel {
  /** Pipeline id. */
  id: string;
  name?: string;
  /** Pipeline `sources`. Empty for a child pipeline only reached through another route. */
  sourceIds: string[];
  rules: RoutingRuleViewModel[];
}

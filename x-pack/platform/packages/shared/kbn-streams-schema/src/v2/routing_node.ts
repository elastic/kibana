/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DisplayFields,
  Identifier,
  NonEmptyArray,
  RoutingMode,
  StreamlangCondition,
} from './common';

export interface RoutingCondition {
  where?: StreamlangCondition;
  to: Identifier;
}

export interface RoutingNode extends DisplayFields {
  id: Identifier;
  mode?: RoutingMode;
  conditions: NonEmptyArray<RoutingCondition>;
}

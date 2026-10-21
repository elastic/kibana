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

export type DestinationType = 'elasticsearch' | 's3' | 'view';

export interface ElasticsearchDestinationConfig {
  index: string;
  index_patterns?: NonEmptyArray<string>;
}

export interface S3DestinationConfig {
  bucket: string;
  role_arn: string;
  format?: 'ndjson' | 'parquet';
  region?: string;
}

export interface ViewDestinationConfig {
  name_override?: string;
}

export interface InnerRoutingCondition {
  where: StreamlangCondition;
  to: Identifier;
}

export interface InnerRoutingNode {
  mode?: RoutingMode;
  conditions: NonEmptyArray<InnerRoutingCondition>;
}

interface BaseDestination extends DisplayFields {
  id: Identifier;
}

export interface ElasticsearchDestination extends BaseDestination {
  type: 'elasticsearch';
  config: { elasticsearch: ElasticsearchDestinationConfig };
  routing_node?: InnerRoutingNode;
}

export interface S3Destination extends BaseDestination {
  type: 's3';
  config: { s3: S3DestinationConfig };
  routing_node?: InnerRoutingNode;
}

export interface ViewDestination extends BaseDestination {
  type: 'view';
  config?: { view?: ViewDestinationConfig };
  routing_node?: never;
}

export type Destination = ElasticsearchDestination | S3Destination | ViewDestination;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { BoolQuery } from '@kbn/es-query';
import {
  colorSchema,
  edgeDataSchema,
  entityNodeDataSchema,
  graphRequestSchema,
  graphResponseSchema,
  groupNodeDataSchema,
  labelNodeDataSchema,
  nodeShapeSchema,
} from '../../schema/graph/v1';

export type GraphRequest = Omit<TypeOf<typeof graphRequestSchema>, 'query.esQuery'> & {
  query: { esQuery?: { bool: Partial<BoolQuery> } };
};
export type GraphResponse = Omit<TypeOf<typeof graphResponseSchema>, 'messages'> & {
  messages?: ApiMessageCode[];
};

export type Color = typeof colorSchema.type;

export type NodeShape = TypeOf<typeof nodeShapeSchema>;

export enum ApiMessageCode {
  ReachedNodesLimit = 'REACHED_NODES_LIMIT',
}

export type EntityNodeDataModel = TypeOf<typeof entityNodeDataSchema>;

export type GroupNodeDataModel = TypeOf<typeof groupNodeDataSchema>;

export type LabelNodeDataModel = TypeOf<typeof labelNodeDataSchema>;

export type EdgeDataModel = TypeOf<typeof edgeDataSchema>;

export type NodeDataModel = EntityNodeDataModel | GroupNodeDataModel | LabelNodeDataModel;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraWrappableRequest } from '../../lib/adapters/framework';
import { InfraNodeType, InfraMetric, InfraTimerangeInput } from '../snapshot/types';

export interface InfraNodeIdsInput {
  nodeId: string;

  cloudId?: string | null;
}

interface NodesArgs {
  nodeType: InfraNodeType;
  nodeId: string;
  cloudId?: string | null;
  metrics: InfraMetric[];
  timerange: InfraTimerangeInput;
}

export interface SourceArgs {
  sourceId: string;
}

export type NodeDetailsRequest = InfraWrappableRequest<NodesArgs & SourceArgs>;

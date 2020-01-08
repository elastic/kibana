/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { JsonObject } from '../../../common/typed_json';
import {
  InfraNodeType,
  InfraSourceConfiguration,
  InfraTimerangeInput,
  InfraSnapshotGroupbyInput,
  InfraSnapshotMetricInput,
} from '../../../public/graphql/types';

export interface InfraSnapshotRequestOptions {
  nodeType: InfraNodeType;
  sourceConfiguration: InfraSourceConfiguration;
  timerange: InfraTimerangeInput;
  groupBy: InfraSnapshotGroupbyInput[];
  metric: InfraSnapshotMetricInput;
  filterQuery: JsonObject | undefined;
  accountId?: string;
  region?: string;
}

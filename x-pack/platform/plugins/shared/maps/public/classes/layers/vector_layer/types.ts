/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InnerJoin } from '../../joins/inner_join';
import type { PropertiesMap } from '../../../../common/elasticsearch_util';

export interface JoinState {
  dataHasChanged: boolean;
  join: InnerJoin;
  joinIndex: number;
  joinMetrics?: PropertiesMap;
}

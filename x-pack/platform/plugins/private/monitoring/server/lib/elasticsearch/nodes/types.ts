/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchLegacySource } from '../../../../common/types/es';

export type Node = ElasticsearchLegacySource['source_node'] & {
  attributes?: Record<string, any>;
  node_ids: Array<string | undefined>;
};

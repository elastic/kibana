/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MeteringStatsIndex } from '../../types';

/**
 * In a deployment where indices have a `green` health status, because there
 * are enough nodes to have replicas for all data indices, (i.e. deployments
 * created in Elastic Cloud), the `_stats` API returns, for any index, results
 * where the index's `primaries.docs.count` and `total.docs.count` have
 * **different** values, `4` and `8`, per this mock `_stats` API output
 */
export const mockStatsGreenIndex: Record<string, MeteringStatsIndex> = {
  'auditbeat-custom-index-1': {
    uuid: 'jRlr6H_jSAysOLZ6KynoCQ',
    size_in_bytes: 28425,
    name: 'auditbeat-custom-index-1',
    num_docs: 4,
  },
};

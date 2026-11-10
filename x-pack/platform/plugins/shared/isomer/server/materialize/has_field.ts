/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

/**
 * Whether every index `index` matches maps `field`, as Kibana's ES|QL time field route checks
 * for `@timestamp`: one field caps request, and `false` when it fails.
 */
export const createHasField =
  (client: ElasticsearchClient) =>
  async (index: string, field: string): Promise<boolean> => {
    try {
      const { fields } = await client.fieldCaps({ index, fields: field, include_unmapped: false });
      return Boolean(fields?.[field]);
    } catch {
      return false;
    }
  };

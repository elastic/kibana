/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { getFlattenedObject } from '@kbn/std';
import { isEmpty } from 'lodash';

export function formatRawDocument({
  hit,
  maxArrayItems = 3,
  shouldNotTruncate = (_key: string) => false,
}: {
  hit: SearchHit<Record<string, any>>;
  maxArrayItems?: number;
  shouldNotTruncate?: (key: string) => boolean;
}): { _id?: string; fields: Record<string, any> } | undefined {
  const fields = {
    ...(hit.fields ?? {}),
    ...getFlattenedObject(hit._source ?? {}),
  };
  if (isEmpty(fields)) return undefined;

  return {
    _id: hit._id,
    fields: Object.fromEntries(
      Object.entries(fields).map(([key, value]) => {
        if (!Array.isArray(value)) return [key, value];

        if (value.length === 1) return [key, value[0]];
        if (shouldNotTruncate(key)) return [key, value];
        if (value.length <= maxArrayItems) return [key, value];

        const remaining = value.length - maxArrayItems;
        return [key, [...value.slice(0, maxArrayItems), `+${remaining} more`]];
      })
    ),
  };
}

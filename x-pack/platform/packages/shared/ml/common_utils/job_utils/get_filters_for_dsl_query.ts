/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Filter } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import type { SerializableRecord } from '@kbn/utility-types';

import { isKnownEmptyQuery } from './is_known_empty_query';

export function getFiltersForDSLQuery(
  datafeedQuery: estypes.QueryDslQueryContainer,
  dataViewId: string | undefined,
  alias?: string,
  store = FilterStateStore.APP_STATE
): Filter[] {
  if (isKnownEmptyQuery(datafeedQuery)) {
    return [];
  }

  return [
    {
      meta: {
        ...(dataViewId !== undefined ? { index: dataViewId } : {}),
        ...(alias !== undefined ? { alias } : {}),
        negate: false,
        disabled: false,
        type: 'custom',
        value: JSON.stringify(datafeedQuery),
      },
      query: datafeedQuery as SerializableRecord,
      $state: {
        store,
      },
    },
  ];
}

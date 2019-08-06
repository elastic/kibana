/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Setup } from '../../server/lib/helpers/setup_request';
import { PARENT_ID } from '../../common/elasticsearch_fieldnames';
import { getBaseTransactionGroupsProjection } from './base_transaction_groups';
import { mergeProjection } from './util/merge_projection';

export function getTracesProjection({ setup }: { setup: Setup }) {
  const projection = mergeProjection(
    getBaseTransactionGroupsProjection({ setup }),
    {
      body: {
        query: {
          bool: {
            must_not: [{ exists: { field: PARENT_ID } }]
          }
        }
      }
    }
  );

  return projection;
}

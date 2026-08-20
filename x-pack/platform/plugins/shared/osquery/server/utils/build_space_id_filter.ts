/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

/**
 * Builds the `space_id` filter clause for osquery ES reads.
 *
 * `spaceId` is required and the function always returns a clause. Callers that
 * lack an active space resolve it to {@link DEFAULT_SPACE_ID} before reaching
 * here — never pass `undefined`.
 *
 * In the default space we also match documents with a missing `space_id`
 * field, because agent-emitted osquerybeat documents (results / action
 * responses) may not carry the field. Named spaces match the `space_id` term
 * exactly and never include field-less documents.
 *
 * `matchMissingSpaceId: false` drops that allowance. Equating "no field" with
 * "default space" only holds while the search is confined to one project. A
 * pack config saved without the per-query `space_id` (see #272411) keeps
 * producing field-less documents until the pack is re-saved, so under CPS
 * fan-out such a document from a linked project may belong to a named space
 * there. Callers whose query is not already bound to an action or schedule id
 * the user could only have learned from a space-stamped document must pass
 * `false` when the read fans out.
 */
export const buildSpaceIdFilter = (
  spaceId: string,
  { matchMissingSpaceId = true }: { matchMissingSpaceId?: boolean } = {}
): estypes.QueryDslQueryContainer => {
  if (spaceId === DEFAULT_SPACE_ID && !matchMissingSpaceId) {
    return { term: { space_id: DEFAULT_SPACE_ID } };
  }

  if (spaceId === DEFAULT_SPACE_ID) {
    return {
      bool: {
        should: [
          { term: { space_id: DEFAULT_SPACE_ID } },
          { bool: { must_not: { exists: { field: 'space_id' } } } },
        ],
      },
    };
  }

  return { term: { space_id: spaceId } };
};

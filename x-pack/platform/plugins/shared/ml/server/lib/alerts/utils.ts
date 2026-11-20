/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { isBoom } from '@hapi/boom';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { TaskErrorSource, createTaskRunError } from '@kbn/task-manager-plugin/server';

/**
 * Decides whether the thrown error is caused by a user-side misconfiguration
 * (missing saved object, unknown ML job/group, malformed job definition).
 *
 * Anything that doesn’t match these predicates will be treated as a framework
 * error and counted toward alert-execution SLOs.
 */
const isUserMisconfigurationError = (err: unknown): boolean => {
  if (SavedObjectsErrorHelpers.isNotFoundError(err as Error)) {
    return true;
  }

  if (
    err !== null &&
    typeof err === 'object' &&
    Object.hasOwn(err, 'statusCode') &&
    (err as { statusCode: unknown }).statusCode === 404
  ) {
    return true;
  }

  if (isBoom(err) && (err.output.statusCode === 404 || err.output.statusCode === 400)) {
    return true;
  }

  return false;
};

export const assertUserError = (err: unknown) => {
  if (isUserMisconfigurationError(err)) {
    throw createTaskRunError(err as Error, TaskErrorSource.USER);
  }
  throw err;
};

// Elasticsearch rejects request lines longer than 4096 bytes (`http.max_initial_line_length`),
// so leave headroom for the method, the rest of the path and the query string.
const MAX_ENCODED_IDS_LENGTH = 3500;
const ENCODED_SEPARATOR_LENGTH = encodeURIComponent(',').length;

/**
 * Splits IDs into comma-joined batches whose URL-encoded length fits in an Elasticsearch request path.
 */
export const chunkIdsForRequestPath = (
  ids: readonly string[],
  maxEncodedLength: number = MAX_ENCODED_IDS_LENGTH
): string[] => {
  const batches: string[] = [];
  let currentBatch: string[] = [];
  let currentLength = 0;

  for (const id of ids) {
    const idLength = encodeURIComponent(id).length;
    const nextLength =
      currentBatch.length === 0 ? idLength : currentLength + ENCODED_SEPARATOR_LENGTH + idLength;

    if (currentBatch.length > 0 && nextLength > maxEncodedLength) {
      batches.push(currentBatch.join(','));
      currentBatch = [id];
      currentLength = idLength;
    } else {
      currentBatch.push(id);
      currentLength = nextLength;
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch.join(','));
  }

  return batches;
};

export const buildAnomalyAlertTimeFilter = ({
  lastRunTime,
  startedAt,
  lookbackInterval,
}: {
  lastRunTime: Date | null;
  startedAt: Date;
  lookbackInterval: string;
}): QueryDslQueryContainer => {
  const timestampRangeFilter = {
    timestamp: {
      gte: `now-${lookbackInterval}`,
      lte: 'now',
    },
  };

  if (!lastRunTime) {
    return {
      range: timestampRangeFilter,
    };
  }

  return {
    bool: {
      should: [
        {
          bool: {
            filter: [
              { exists: { field: 'event.ingested' } },
              {
                range: {
                  'event.ingested': {
                    gte: lastRunTime.toISOString(),
                    // Exclude docs indexed during this run so the next run (gte: this startedAt) does not match them again.
                    lt: startedAt.toISOString(),
                  },
                },
              },
            ],
          },
        },
        {
          bool: {
            must_not: { exists: { field: 'event.ingested' } },
            filter: {
              range: timestampRangeFilter,
            },
          },
        },
      ],
      minimum_should_match: 1,
    },
  };
};

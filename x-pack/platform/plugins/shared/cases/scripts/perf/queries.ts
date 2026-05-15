/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A/B query builders mirroring the cases backend's actual nested-references
 * aggregations and their flat `caseId` equivalents. Variant `a` is the shape
 * the cases server issues today; variant `b` is what it would issue after
 * migrating the helpers to use the indexed scripted `caseId` keyword.
 *
 * All queries target the alerting/cases SO index pattern. SO type filter is
 * applied at the top so the agg sees only docs of the relevant SO type.
 */

export type Variant = 'a' | 'b';

export type QueryName =
  | 'unified-attachment-stats'
  | 'comment-stats'
  | 'find-by-caseid';

const ATT = 'cases-attachments';
const COMMENT = 'cases-comments';

const soTypeFilter = (soType: string) => ({ term: { type: soType } });

/**
 * Variant A: nested terms over `<so>.references.id` with reverse_nested
 * sub-aggs filtering by attachment type / counting unique alertId / eventId.
 * This matches `getUnifiedAttachmentStatsByCaseId` in
 * server/services/attachments/operations/get.ts.
 */
const unifiedAttachmentStatsA = (caseIds: string[]) => ({
  size: 0,
  track_total_hits: false,
  query: {
    bool: {
      filter: [
        soTypeFilter(ATT),
        {
          nested: {
            path: `${ATT}.references`,
            query: {
              bool: {
                must: [
                  { term: { [`${ATT}.references.type`]: 'cases' } },
                  { terms: { [`${ATT}.references.id`]: caseIds } },
                ],
              },
            },
          },
        },
      ],
    },
  },
  aggs: {
    refs: {
      nested: { path: `${ATT}.references` },
      aggs: {
        caseIds: {
          terms: { field: `${ATT}.references.id`, size: caseIds.length, include: caseIds },
          aggs: {
            reverse: {
              reverse_nested: {},
              aggs: {
                comments: {
                  filter: { term: { [`${ATT}.attributes.type`]: 'user' } },
                },
                events: {
                  filter: { term: { [`${ATT}.attributes.type`]: 'event' } },
                  aggs: {
                    eventIds: {
                      cardinality: { field: `${ATT}.attributes.attachmentId` },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});

const unifiedAttachmentStatsB = (caseIds: string[]) => ({
  size: 0,
  track_total_hits: false,
  query: {
    bool: {
      filter: [soTypeFilter(ATT), { terms: { caseId: caseIds } }],
    },
  },
  aggs: {
    caseIds: {
      terms: { field: 'caseId', size: caseIds.length },
      aggs: {
        comments: {
          filter: { term: { [`${ATT}.attributes.type`]: 'user' } },
        },
        events: {
          filter: { term: { [`${ATT}.attributes.type`]: 'event' } },
          aggs: {
            eventIds: {
              cardinality: { field: `${ATT}.attributes.attachmentId` },
            },
          },
        },
      },
    },
  },
});

/**
 * Variant A for `buildCommentStatsAggs` in the same file — bucketed by case
 * over `cases-comments` references, with cardinality on alertId and eventId
 * plus a filtered count of user comments.
 */
const commentStatsA = (caseIds: string[]) => ({
  size: 0,
  track_total_hits: false,
  query: {
    bool: {
      filter: [
        soTypeFilter(COMMENT),
        {
          nested: {
            path: `${COMMENT}.references`,
            query: {
              bool: {
                must: [
                  { term: { [`${COMMENT}.references.type`]: 'cases' } },
                  { terms: { [`${COMMENT}.references.id`]: caseIds } },
                ],
              },
            },
          },
        },
      ],
    },
  },
  aggs: {
    references: {
      nested: { path: `${COMMENT}.references` },
      aggs: {
        caseIds: {
          terms: { field: `${COMMENT}.references.id`, size: caseIds.length, include: caseIds },
          aggs: {
            reverse: {
              reverse_nested: {},
              aggs: {
                alerts: {
                  cardinality: { field: `${COMMENT}.attributes.alertId` },
                },
                comments: {
                  filter: { term: { [`${COMMENT}.attributes.type`]: 'user' } },
                },
                events: {
                  cardinality: { field: `${COMMENT}.attributes.eventId` },
                },
              },
            },
          },
        },
      },
    },
  },
});

const commentStatsB = (caseIds: string[]) => ({
  size: 0,
  track_total_hits: false,
  query: {
    bool: {
      filter: [soTypeFilter(COMMENT), { terms: { caseId: caseIds } }],
    },
  },
  aggs: {
    caseIds: {
      terms: { field: 'caseId', size: caseIds.length },
      aggs: {
        alerts: {
          cardinality: { field: `${COMMENT}.attributes.alertId` },
        },
        comments: {
          filter: { term: { [`${COMMENT}.attributes.type`]: 'user' } },
        },
        events: {
          cardinality: { field: `${COMMENT}.attributes.eventId` },
        },
      },
    },
  },
});

/**
 * Plain "find every attachment for these case ids" — the lowest-level
 * pattern shared by virtually every per-case query in cases.
 */
const findByCaseIdA = (caseIds: string[]) => ({
  size: 100,
  track_total_hits: true,
  _source: false,
  query: {
    bool: {
      filter: [
        soTypeFilter(ATT),
        {
          nested: {
            path: `${ATT}.references`,
            query: {
              bool: {
                must: [
                  { term: { [`${ATT}.references.type`]: 'cases' } },
                  { terms: { [`${ATT}.references.id`]: caseIds } },
                ],
              },
            },
          },
        },
      ],
    },
  },
});

const findByCaseIdB = (caseIds: string[]) => ({
  size: 100,
  track_total_hits: true,
  _source: false,
  query: {
    bool: {
      filter: [soTypeFilter(ATT), { terms: { caseId: caseIds } }],
    },
  },
});

const builders: Record<QueryName, Record<Variant, (caseIds: string[]) => unknown>> = {
  'unified-attachment-stats': { a: unifiedAttachmentStatsA, b: unifiedAttachmentStatsB },
  'comment-stats': { a: commentStatsA, b: commentStatsB },
  'find-by-caseid': { a: findByCaseIdA, b: findByCaseIdB },
};

export const buildQuery = (
  name: QueryName,
  variant: Variant,
  caseIds: string[]
): unknown => builders[name][variant](caseIds);

export const ALL_QUERIES: QueryName[] = [
  'unified-attachment-stats',
  'comment-stats',
  'find-by-caseid',
];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  OWNERS,
} from '../../../common/constants';
import {
  EXTERNAL_REFERENCE_TYPE_MAP,
  LEGACY_ALERT_TYPE,
  LEGACY_EVENT_TYPE,
  LEGACY_EXTERNAL_REFERENCE_TYPE,
  LEGACY_PERSISTABLE_STATE_TYPE,
  LEGACY_TO_UNIFIED_MAP,
  OWNER_TO_PREFIX_MAP,
  PERSISTABLE_STATE_LEGACY_TO_UNIFIED_MAP,
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_EVENT_ATTACHMENT_TYPE,
} from '../../../common/constants/attachments';
import type { Owner } from '../../../common/constants/types';
import type {
  AttachmentTypeStats,
  BySavedObjectStats,
  FileAttachmentAggsResult,
  FileAttachmentStats,
} from '../types';
import type { TelemetrySavedObjectsClient } from '../telemetry_saved_objects_client';

/** Cap on the attachment-type `terms` aggregation (was 10, dropped new types). */
const TYPE_TERMS_SIZE = 50;

/**
 * Unified types whose attachments reference multiple entities per document
 * (bulk alert/event attach). These are counted by entity (`value_count` on the
 * id field) rather than by document.
 */
const MULTI_ID_UNIFIED_TYPES = new Set<string>([
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_EVENT_ATTACHMENT_TYPE,
  `${OWNER_TO_PREFIX_MAP.observability}.alert`,
  `${OWNER_TO_PREFIX_MAP.observability}.event`,
  `${OWNER_TO_PREFIX_MAP.cases}.alert`,
  `${OWNER_TO_PREFIX_MAP.cases}.event`,
]);

/** Legacy `type` values handled by dedicated aggregations, not the type terms. */
const LEGACY_TYPES_HANDLED_ELSEWHERE = new Set<string>([
  LEGACY_ALERT_TYPE,
  LEGACY_EVENT_TYPE,
  LEGACY_EXTERNAL_REFERENCE_TYPE,
  LEGACY_PERSISTABLE_STATE_TYPE,
]);

interface RawTypeStat {
  total: number;
}

type RawByType = Record<string, RawTypeStat>;

export interface AttachmentsByTypeRawScope {
  byType: RawByType;
  bySavedObject: BySavedObjectStats;
}

export interface AttachmentsByTypeRaw {
  all: AttachmentsByTypeRawScope;
  securitySolution: AttachmentsByTypeRawScope;
  observability: AttachmentsByTypeRawScope;
  cases: AttachmentsByTypeRawScope;
}

interface EntityMetricsResult {
  entityTotal: { value: number };
}

interface TermsBuckets<M> {
  buckets: Array<{ key: string; doc_count: number } & M>;
}

interface CommentsOwnerAgg {
  doc_count: number;
  types: TermsBuckets<{}>;
  alert: { doc_count: number } & EntityMetricsResult;
  event: { doc_count: number } & EntityMetricsResult;
  externalReferenceTypes: TermsBuckets<{}>;
  persistableReferenceTypes: TermsBuckets<{}>;
}

interface AttachmentsOwnerAgg {
  doc_count: number;
  types: TermsBuckets<EntityMetricsResult>;
}

type CommentsAggResult = Record<Owner, CommentsOwnerAgg>;
type AttachmentsAggResult = Record<Owner, AttachmentsOwnerAgg>;

const emptyRawScope = (): AttachmentsByTypeRawScope => ({
  byType: {},
  bySavedObject: { legacy: { total: 0 }, unified: { total: 0 } },
});

const perCaseEntityMetrics = (savedObjectType: string, idField: string) => ({
  entityTotal: { value_count: { field: `${savedObjectType}.attributes.${idField}` } },
});

const buildOwnerPartitions = <T extends object>(
  savedObjectType: string,
  buildAggs: () => T
): Record<string, { filter: object; aggs: T }> =>
  OWNERS.reduce(
    (acc, owner) => ({
      ...acc,
      [owner]: {
        filter: { term: { [`${savedObjectType}.attributes.owner`]: owner } },
        aggs: buildAggs(),
      },
    }),
    {}
  );

const queryLegacyComments = (savedObjectsClient: TelemetrySavedObjectsClient) => {
  const type = `${CASE_COMMENT_SAVED_OBJECT}.attributes.type`;
  const buildAggs = () => ({
    types: {
      terms: { field: type, size: TYPE_TERMS_SIZE },
    },
    alert: {
      filter: { term: { [type]: LEGACY_ALERT_TYPE } },
      aggs: perCaseEntityMetrics(CASE_COMMENT_SAVED_OBJECT, 'alertId'),
    },
    event: {
      filter: { term: { [type]: LEGACY_EVENT_TYPE } },
      aggs: perCaseEntityMetrics(CASE_COMMENT_SAVED_OBJECT, 'eventId'),
    },
    externalReferenceTypes: {
      terms: {
        field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.externalReferenceAttachmentTypeId`,
        size: TYPE_TERMS_SIZE,
      },
    },
    persistableReferenceTypes: {
      terms: {
        field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.persistableStateAttachmentTypeId`,
        size: TYPE_TERMS_SIZE,
      },
    },
  });

  return savedObjectsClient.find<unknown, CommentsAggResult>({
    page: 0,
    perPage: 0,
    type: CASE_COMMENT_SAVED_OBJECT,
    namespaces: ['*'],
    aggs: buildOwnerPartitions(CASE_COMMENT_SAVED_OBJECT, buildAggs),
  });
};

const queryUnifiedAttachments = (savedObjectsClient: TelemetrySavedObjectsClient) => {
  const buildAggs = () => ({
    types: {
      terms: {
        field: `${CASE_ATTACHMENT_SAVED_OBJECT}.attributes.type`,
        size: TYPE_TERMS_SIZE,
      },
      aggs: perCaseEntityMetrics(CASE_ATTACHMENT_SAVED_OBJECT, 'attachmentId'),
    },
  });

  return savedObjectsClient.find<unknown, AttachmentsAggResult>({
    page: 0,
    perPage: 0,
    type: CASE_ATTACHMENT_SAVED_OBJECT,
    namespaces: ['*'],
    aggs: buildOwnerPartitions(CASE_ATTACHMENT_SAVED_OBJECT, buildAggs),
  });
};

const addRawStat = (byType: RawByType, key: string, stat: RawTypeStat): void => {
  const existing = byType[key];
  byType[key] = { total: (existing?.total ?? 0) + stat.total };
};

const docStatFromBucket = (bucket: { doc_count: number }): RawTypeStat => ({
  total: bucket.doc_count,
});

const entityStat = (agg: EntityMetricsResult): RawTypeStat => ({
  total: agg.entityTotal?.value ?? 0,
});

const combinedStat = (
  bucket: { doc_count: number } & EntityMetricsResult,
  isEntity: boolean
): RawTypeStat => ({
  total: isEntity ? bucket.entityTotal?.value ?? 0 : bucket.doc_count,
});

const ownerPrefix = (owner: Owner): string => OWNER_TO_PREFIX_MAP[owner] ?? owner;

const processLegacyOwner = (owner: Owner, agg?: CommentsOwnerAgg): RawByType => {
  const byType: RawByType = {};
  if (!agg) {
    return byType;
  }

  const typeBuckets = agg.types.buckets.filter(
    (bucket) => !LEGACY_TYPES_HANDLED_ELSEWHERE.has(bucket.key)
  );
  for (const bucket of typeBuckets) {
    const unified = LEGACY_TO_UNIFIED_MAP[bucket.key] ?? bucket.key;
    addRawStat(byType, unified, docStatFromBucket(bucket));
  }

  if (agg.alert?.doc_count) {
    addRawStat(byType, `${ownerPrefix(owner)}.alert`, entityStat(agg.alert));
  }
  if (agg.event?.doc_count) {
    addRawStat(byType, `${ownerPrefix(owner)}.event`, entityStat(agg.event));
  }

  for (const bucket of agg.externalReferenceTypes.buckets) {
    const unified = EXTERNAL_REFERENCE_TYPE_MAP[bucket.key] ?? bucket.key;
    addRawStat(byType, unified, docStatFromBucket(bucket));
  }
  for (const bucket of agg.persistableReferenceTypes.buckets) {
    const unified = PERSISTABLE_STATE_LEGACY_TO_UNIFIED_MAP[bucket.key] ?? bucket.key;
    addRawStat(byType, unified, docStatFromBucket(bucket));
  }

  return byType;
};

const processUnifiedOwner = (agg?: AttachmentsOwnerAgg): RawByType => {
  const byType: RawByType = {};
  if (!agg) {
    return byType;
  }
  for (const bucket of agg.types.buckets) {
    addRawStat(byType, bucket.key, combinedStat(bucket, MULTI_ID_UNIFIED_TYPES.has(bucket.key)));
  }
  return byType;
};

const mergeByType = (target: RawByType, source: RawByType): void => {
  for (const [key, stat] of Object.entries(source)) {
    addRawStat(target, key, stat);
  }
};

// Sums entity-aware totals (bulk alert/event attachments count by referenced
// id, not by document) so `bySavedObject` stays consistent with `byType`.
const sumTotals = (byType: RawByType): number =>
  Object.values(byType).reduce((sum, stat) => sum + stat.total, 0);

export const getAttachmentsByTypeData = async ({
  savedObjectsClient,
}: {
  savedObjectsClient: TelemetrySavedObjectsClient;
}): Promise<AttachmentsByTypeRaw> => {
  const [legacyRes, unifiedRes] = await Promise.all([
    queryLegacyComments(savedObjectsClient),
    queryUnifiedAttachments(savedObjectsClient),
  ]);

  const result: AttachmentsByTypeRaw = {
    all: emptyRawScope(),
    securitySolution: emptyRawScope(),
    observability: emptyRawScope(),
    cases: emptyRawScope(),
  };

  for (const owner of OWNERS) {
    const legacyOwner = legacyRes.aggregations?.[owner];
    const unifiedOwner = unifiedRes.aggregations?.[owner];

    const legacyByType = processLegacyOwner(owner, legacyOwner);
    const unifiedByType = processUnifiedOwner(unifiedOwner);

    const byType = { ...legacyByType };
    mergeByType(byType, unifiedByType);

    const bySavedObject: BySavedObjectStats = {
      legacy: { total: sumTotals(legacyByType) },
      unified: { total: sumTotals(unifiedByType) },
    };

    result[owner] = { byType, bySavedObject };

    mergeByType(result.all.byType, byType);
    result.all.bySavedObject.legacy.total += bySavedObject.legacy.total;
    result.all.bySavedObject.unified.total += bySavedObject.unified.total;
  }

  return result;
};

/** Sanitizes a unified type name for use as a telemetry map key (`.` -> `_`). */
export const sanitizeTypeKey = (type: string): string => type.replace(/\./g, '_');

const calculateAverage = (total: number, totalCases: number): number =>
  totalCases === 0 ? 0 : Math.round(total / totalCases);

export const getFileStats = (
  filesAggregations?: FileAttachmentAggsResult
): FileAttachmentStats => ({
  averageSize:
    filesAggregations?.averageSize?.value == null
      ? 0
      : Math.round(filesAggregations.averageSize.value),
  topMimeTypes:
    filesAggregations?.topMimeTypes?.buckets.map((bucket) => ({
      name: bucket.key,
      count: bucket.doc_count,
    })) ?? [],
});

/**
 * Finalizes a raw scope into the emitted `attachmentFramework` shape: computes
 * per-type `average`, sanitizes the map keys, and folds in file-specific stats.
 */
export const buildAttachmentFramework = ({
  rawScope,
  filesAggregations,
  totalCasesForOwner,
}: {
  rawScope?: AttachmentsByTypeRawScope;
  filesAggregations?: FileAttachmentAggsResult;
  totalCasesForOwner: number;
}) => {
  const scope = rawScope ?? emptyRawScope();
  const attachmentsByType = Object.entries(scope.byType).reduce<
    Record<string, AttachmentTypeStats>
  >((acc, [type, stat]) => {
    acc[sanitizeTypeKey(type)] = {
      total: stat.total,
      average: calculateAverage(stat.total, totalCasesForOwner),
    };
    return acc;
  }, {});

  return {
    attachmentFramework: {
      attachmentsByType,
      bySavedObject: scope.bySavedObject,
      files: getFileStats(filesAggregations),
    },
  };
};

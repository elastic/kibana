/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResponse } from '@kbn/core/server';
import { FILE_SO_TYPE } from '@kbn/files-plugin/common';
import { fromKueryExpression } from '@kbn/es-query';
import type { SortOrder } from '../../../common/ui/types';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  OWNERS,
} from '../../../common/constants';
import type {
  CollectTelemetryDataParams,
  CasesTelemetry,
  ReferencesAggregation,
  LatestDates,
  CaseAggregationResult,
  AttachmentAggregationResult,
  FileAttachmentAggregationResults,
  CasesTelemetryWithAlertsAggsByOwnerResults,
} from '../types';
import {
  findValueInBuckets,
  getAggregationsBuckets,
  getAttachmentsFrameworkStats,
  getCountsAggregationQuery,
  getCountsFromBuckets,
  getMaxBucketOnCaseAggregationQuery,
  getOnlyAlertsCommentsFilter,
  getOnlyConnectorsFilter,
  getReferencesAggregationQuery,
  getSolutionValues,
  getObservablesTotalsByType,
  getTotalWithMaxObservables,
} from './utils';
import type { CasePersistedAttributes } from '../../common/types/case';
import { CasePersistedStatus } from '../../common/types/case';
import type { TelemetrySavedObjectsClient } from '../telemetry_saved_objects_client';

export const getLatestCasesDates = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<LatestDates> => {
  const find = async (sortField: string) =>
    savedObjectsClient.find<CasePersistedAttributes>({
      page: 1,
      perPage: 1,
      sortField,
      sortOrder: 'desc',
      type: CASE_SAVED_OBJECT,
      namespaces: ['*'],
    });

  const savedObjects = await Promise.all([
    find('created_at'),
    find('updated_at'),
    find('closed_at'),
  ]);

  return {
    createdAt: savedObjects?.[0]?.saved_objects?.[0]?.attributes?.created_at ?? '',
    updatedAt: savedObjects?.[1]?.saved_objects?.[0]?.attributes?.updated_at ?? '',
    closedAt: savedObjects?.[2]?.saved_objects?.[0]?.attributes?.closed_at ?? '',
  };
};

export const getCasesTelemetryData = async ({
  savedObjectsClient,
  logger,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['cases']> => {
  try {
    const [
      casesRes,
      casesWithAlertsRes,
      commentsRes,
      totalAlertsRes,
      totalConnectorsRes,
      latestDates,
      filesRes,
    ] = await Promise.all([
      getCasesSavedObjectTelemetry(savedObjectsClient),
      getCasesWithAlertsByOwner(savedObjectsClient),
      getCommentsSavedObjectTelemetry(savedObjectsClient),
      getAlertsTelemetry(savedObjectsClient),
      getConnectorsTelemetry(savedObjectsClient),
      getLatestCasesDates({ savedObjectsClient, logger }),
      getFilesTelemetry(savedObjectsClient),
    ]);

    const aggregationsBuckets = getAggregationsBuckets({
      aggs: casesRes.aggregations,
      keys: ['counts', 'syncAlerts', 'extractObservables', 'status', 'users', 'totalAssignees'],
    });

    const allAttachmentFrameworkStats = getAttachmentsFrameworkStats({
      attachmentAggregations: commentsRes.aggregations,
      totalCasesForOwner: casesRes.total,
      filesAggregations: filesRes.aggregations,
    });

    return {
      all: {
        total: casesRes.total,
        ...getCountsFromBuckets(aggregationsBuckets.counts),
        status: {
          open: findValueInBuckets(aggregationsBuckets.status, CasePersistedStatus.OPEN),
          inProgress: findValueInBuckets(
            aggregationsBuckets.status,
            CasePersistedStatus.IN_PROGRESS
          ),
          closed: findValueInBuckets(aggregationsBuckets.status, CasePersistedStatus.CLOSED),
        },
        syncAlertsOn: findValueInBuckets(aggregationsBuckets.syncAlerts, 1),
        syncAlertsOff: findValueInBuckets(aggregationsBuckets.syncAlerts, 0),
        extractObservablesOn: findValueInBuckets(aggregationsBuckets.extractObservables, 1),
        extractObservablesOff: findValueInBuckets(aggregationsBuckets.extractObservables, 0),
        observables: getObservablesTotalsByType(casesRes.aggregations?.observables),
        totalWithMaxObservables: getTotalWithMaxObservables(
          casesRes.aggregations?.totalWithMaxObservables?.buckets ?? []
        ),
        totalUsers: casesRes.aggregations?.users?.value ?? 0,
        totalParticipants: commentsRes.aggregations?.participants?.value ?? 0,
        totalTags: casesRes.aggregations?.tags?.value ?? 0,
        totalWithAlerts:
          totalAlertsRes.aggregations?.references?.referenceType?.referenceAgg?.value ?? 0,
        totalWithConnectors:
          totalConnectorsRes.aggregations?.references?.referenceType?.referenceAgg?.value ?? 0,
        latestDates,
        assignees: {
          total: casesRes.aggregations?.totalAssignees.value ?? 0,
          totalWithZero: casesRes.aggregations?.assigneeFilters.buckets.zero.doc_count ?? 0,
          totalWithAtLeastOne:
            casesRes.aggregations?.assigneeFilters.buckets.atLeastOne.doc_count ?? 0,
        },
        ...allAttachmentFrameworkStats,
      },
      sec: getSolutionValues({
        caseAggregations: casesRes.aggregations,
        attachmentAggregations: commentsRes.aggregations,
        filesAggregations: filesRes.aggregations,
        casesTotalWithAlerts: casesWithAlertsRes.aggregations,
        owner: 'securitySolution',
      }),
      obs: getSolutionValues({
        caseAggregations: casesRes.aggregations,
        attachmentAggregations: commentsRes.aggregations,
        filesAggregations: filesRes.aggregations,
        casesTotalWithAlerts: casesWithAlertsRes.aggregations,
        owner: 'observability',
      }),
      main: getSolutionValues({
        caseAggregations: casesRes.aggregations,
        attachmentAggregations: commentsRes.aggregations,
        filesAggregations: filesRes.aggregations,
        casesTotalWithAlerts: casesWithAlertsRes.aggregations,
        owner: 'cases',
      }),
    };
  } catch (error) {
    logger.error(`Cases telemetry failed with error: ${error}`);
    throw error;
  }
};

const getCasesSavedObjectTelemetry = async (
  savedObjectsClient: TelemetrySavedObjectsClient
): Promise<SavedObjectsFindResponse<unknown, CaseAggregationResult>> => {
  const caseByOwnerAggregationQuery = OWNERS.reduce(
    (aggQuery, owner) => ({
      ...aggQuery,
      [owner]: {
        filter: {
          term: {
            [`${CASE_SAVED_OBJECT}.attributes.owner`]: owner,
          },
        },
        aggs: {
          ...getCountsAggregationQuery(CASE_SAVED_OBJECT),
          ...getAssigneesAggregations(),
          ...getObservablesAggregations(),
          ...getStatusAggregation(),
        },
      },
    }),
    {}
  );

  return savedObjectsClient.find<unknown, CaseAggregationResult>({
    page: 0,
    perPage: 0,
    type: CASE_SAVED_OBJECT,
    namespaces: ['*'],
    aggs: {
      ...caseByOwnerAggregationQuery,
      ...getCountsAggregationQuery(CASE_SAVED_OBJECT),
      ...getAssigneesAggregations(),
      ...getStatusAggregation(),
      ...getObservablesAggregations(),
      totalsByOwner: {
        terms: { field: `${CASE_SAVED_OBJECT}.attributes.owner` },
      },
      syncAlerts: {
        terms: { field: `${CASE_SAVED_OBJECT}.attributes.settings.syncAlerts` },
      },
      extractObservables: {
        terms: { field: `${CASE_SAVED_OBJECT}.attributes.settings.extractObservables` },
      },
      users: {
        cardinality: {
          field: `${CASE_SAVED_OBJECT}.attributes.created_by.username`,
        },
      },
      tags: {
        cardinality: {
          field: `${CASE_SAVED_OBJECT}.attributes.tags`,
        },
      },
    },
  });
};

const getAssigneesAggregations = () => ({
  totalAssignees: {
    value_count: {
      field: `${CASE_SAVED_OBJECT}.attributes.assignees.uid`,
    },
  },
  assigneeFilters: {
    filters: {
      filters: {
        zero: {
          bool: {
            must_not: {
              exists: {
                field: `${CASE_SAVED_OBJECT}.attributes.assignees.uid`,
              },
            },
          },
        },
        atLeastOne: {
          bool: {
            filter: {
              exists: {
                field: `${CASE_SAVED_OBJECT}.attributes.assignees.uid`,
              },
            },
          },
        },
      },
    },
  },
});

const getStatusAggregation = () => ({
  status: {
    terms: {
      field: `${CASE_SAVED_OBJECT}.attributes.status`,
    },
  },
});

const getObservablesAggregations = () => ({
  observables: {
    nested: {
      path: `${CASE_SAVED_OBJECT}.attributes.observables`,
    },
    aggs: {
      byDescription: {
        terms: {
          field: `${CASE_SAVED_OBJECT}.attributes.observables.description`,
        },
        aggs: {
          byType: {
            terms: {
              field: `${CASE_SAVED_OBJECT}.attributes.observables.typeKey`,
            },
          },
        },
      },
    },
  },
  totalWithMaxObservables: {
    terms: {
      field: `${CASE_SAVED_OBJECT}.attributes.total_observables`,
      size: 100,
      order: { _key: 'desc' as SortOrder },
    },
  },
});

const getCommentsSavedObjectTelemetry = async (
  savedObjectsClient: TelemetrySavedObjectsClient
): Promise<SavedObjectsFindResponse<unknown, AttachmentAggregationResult>> => {
  const attachmentRegistries = () => ({
    externalReferenceTypes: {
      terms: {
        field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.externalReferenceAttachmentTypeId`,
        size: 10,
      },
      aggs: {
        ...getMaxBucketOnCaseAggregationQuery(CASE_COMMENT_SAVED_OBJECT),
      },
    },
    persistableReferenceTypes: {
      terms: {
        field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.persistableStateAttachmentTypeId`,
        size: 10,
      },
      aggs: {
        ...getMaxBucketOnCaseAggregationQuery(CASE_COMMENT_SAVED_OBJECT),
      },
    },
  });

  const attachmentsByOwnerAggregationQuery = OWNERS.reduce(
    (aggQuery, owner) => ({
      ...aggQuery,
      [owner]: {
        filter: {
          term: {
            [`${CASE_COMMENT_SAVED_OBJECT}.attributes.owner`]: owner,
          },
        },
        aggs: {
          ...attachmentRegistries(),
        },
      },
    }),
    {}
  );

  return savedObjectsClient.find<unknown, AttachmentAggregationResult>({
    page: 0,
    perPage: 0,
    type: CASE_COMMENT_SAVED_OBJECT,
    namespaces: ['*'],
    aggs: {
      ...attachmentsByOwnerAggregationQuery,
      ...attachmentRegistries(),
      participants: {
        cardinality: {
          field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.created_by.username`,
        },
      },
    },
  });
};

const getFilesTelemetry = async (
  savedObjectsClient: TelemetrySavedObjectsClient
): Promise<SavedObjectsFindResponse<unknown, FileAttachmentAggregationResults>> => {
  const averageSize = () => ({
    averageSize: {
      avg: {
        field: `${FILE_SO_TYPE}.attributes.size`,
      },
    },
  });

  const top20MimeTypes = () => ({
    topMimeTypes: {
      terms: {
        field: `${FILE_SO_TYPE}.attributes.mime_type`,
        size: 20,
      },
    },
  });

  const filesByOwnerAggregationQuery = OWNERS.reduce(
    (aggQuery, owner) => ({
      ...aggQuery,
      [owner]: {
        filter: {
          term: {
            [`${FILE_SO_TYPE}.attributes.Meta.owner`]: owner,
          },
        },
        aggs: {
          ...averageSize(),
          ...top20MimeTypes(),
        },
      },
    }),
    {}
  );

  const filterCaseIdExists = fromKueryExpression(`${FILE_SO_TYPE}.attributes.Meta.caseIds: *`);

  return savedObjectsClient.find<unknown, FileAttachmentAggregationResults>({
    page: 0,
    perPage: 0,
    type: FILE_SO_TYPE,
    filter: filterCaseIdExists,
    namespaces: ['*'],
    aggs: { ...filesByOwnerAggregationQuery, ...averageSize(), ...top20MimeTypes() },
  });
};

const getAlertsTelemetry = async (
  savedObjectsClient: TelemetrySavedObjectsClient
): Promise<SavedObjectsFindResponse<unknown, ReferencesAggregation>> => {
  return savedObjectsClient.find<unknown, ReferencesAggregation>({
    page: 0,
    perPage: 0,
    type: CASE_COMMENT_SAVED_OBJECT,
    namespaces: ['*'],
    filter: getOnlyAlertsCommentsFilter(),
    aggs: {
      ...getReferencesAggregationQuery({
        savedObjectType: CASE_COMMENT_SAVED_OBJECT,
        referenceType: 'cases',
        agg: 'cardinality',
      }),
    },
  });
};

const getConnectorsTelemetry = async (
  savedObjectsClient: TelemetrySavedObjectsClient
): Promise<SavedObjectsFindResponse<unknown, ReferencesAggregation>> => {
  return savedObjectsClient.find<unknown, ReferencesAggregation>({
    page: 0,
    perPage: 0,
    type: CASE_USER_ACTION_SAVED_OBJECT,
    namespaces: ['*'],
    filter: getOnlyConnectorsFilter(),
    aggs: {
      ...getReferencesAggregationQuery({
        savedObjectType: CASE_USER_ACTION_SAVED_OBJECT,
        referenceType: 'cases',
        agg: 'cardinality',
      }),
    },
  });
};

const getCasesWithAlertsByOwner = async (
  savedObjectsClient: TelemetrySavedObjectsClient
): Promise<SavedObjectsFindResponse<unknown, CasesTelemetryWithAlertsAggsByOwnerResults>> => {
  return savedObjectsClient.find<unknown, CasesTelemetryWithAlertsAggsByOwnerResults>({
    page: 0,
    perPage: 0,
    type: CASE_COMMENT_SAVED_OBJECT,
    namespaces: ['*'],
    filter: getOnlyAlertsCommentsFilter(),
    aggs: {
      by_owner: {
        terms: {
          field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.owner`,
          size: 3,
          include: ['securitySolution', 'observability', 'cases'],
        },
        aggs: {
          ...getReferencesAggregationQuery({
            savedObjectType: CASE_COMMENT_SAVED_OBJECT,
            referenceType: 'cases',
            agg: 'cardinality',
          }),
        },
      },
    },
  });
};

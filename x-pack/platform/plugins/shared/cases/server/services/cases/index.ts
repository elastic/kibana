/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  ElasticsearchClient,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsUpdateResponse,
  SavedObjectsResolveResponse,
  SavedObjectsFindOptions,
  SavedObjectsBulkDeleteObject,
  SavedObjectsBulkDeleteOptions,
} from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

import type { estypes } from '@elastic/elasticsearch';
import type {
  MappingRuntimeFields,
  MappingRuntimeFieldType,
} from '@elastic/elasticsearch/lib/api/types';
import { nodeBuilder, toElasticsearchQuery } from '@kbn/es-query';

import type {
  SavedObjectsSearchOptions,
  SavedObjectsSearchResponse,
} from '@kbn/core-saved-objects-api-server';
import type { Case, CaseStatuses, User } from '../../../common/types/domain';
import { caseStatuses } from '../../../common/types/domain';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  MAX_DOCS_PER_PAGE,
} from '../../../common/constants';
import { decodeOrThrow } from '../../common/runtime_types';
import type {
  SavedObjectFindOptionsKueryNode,
  SavedObjectsBulkResponseWithErrors,
  SOWithErrors,
} from '../../common/types';
import { defaultSortField, flattenCaseSavedObject } from '../../common/utils';
import { DEFAULT_PAGE, DEFAULT_PER_PAGE } from '../../routes/api';
import { combineFilters } from '../../client/utils';
import { includeFieldsRequiredForAuthentication } from '../../authorization/utils';
import {
  transformSavedObjectToExternalModel,
  transformAttributesToESModel,
  transformUpdateResponseToExternalModel,
  transformFindResponseToExternalModel,
  transformESModelToCase,
} from './transform';
import type { AttachmentService } from '../attachments';
import type { AggregationBuilder, AggregationResponse } from '../../client/metrics/types';
import { createCaseError, isSOError } from '../../common/error';
import type {
  CasePersistedAttributes,
  CaseSavedObjectTransformed,
  CaseTransformedAttributes,
} from '../../common/types/case';
import {
  CaseTransformedAttributesRt,
  CasePersistedStatus,
  getPartialCaseTransformedAttributesRt,
  OwnerRt,
} from '../../common/types/case';
import type {
  GetCaseIdsByAlertIdArgs,
  GetCaseIdsByAlertIdAggs,
  CasesMapWithPageInfo,
  DeleteCaseArgs,
  GetCaseArgs,
  GetCasesArgs,
  FindCommentsArgs,
  FindCaseCommentsArgs,
  GetReportersArgs,
  GetTagsArgs,
  CreateCaseArgs,
  PatchCaseArgs,
  PatchCasesArgs,
  GetCategoryArgs,
  BulkCreateCasesArgs,
} from './types';
import type { AttachmentTransformedAttributes } from '../../common/types/attachments';
import { bulkDecodeSOAttributes } from '../utils';
import {
  DEFAULT_ATTACHMENT_SEARCH_FIELDS,
  constructSearchQuery,
  convertFindQueryParams,
  mergeSearchQuery,
} from './utils';
import { getContentIndexName } from '../../cases_analytics/content_index/constants';
import { CAI_CONTENT_INDEX_SCRIPT_ID } from '../../cases_analytics/content_index/painless_scripts';

const PartialCaseTransformedAttributesRt = getPartialCaseTransformedAttributesRt();

const EXTENDED_FIELD_TYPES = [
  'keyword',
  'boolean',
  'date',
  'ip',
  'text',
  'long',
  'integer',
  'float',
] as const;

const EXTENDED_FIELD_COUNT = 1000;

const RUNTIME_TYPE_MAP: Record<string, MappingRuntimeFieldType> = {
  keyword: 'keyword',
  boolean: 'boolean',
  date: 'date',
  ip: 'ip',
  text: 'keyword',
  long: 'long',
  integer: 'long',
  float: 'double',
};

function generateExtendedFieldsRuntimeMappings(): MappingRuntimeFields {
  const runtime: MappingRuntimeFields = {};

  for (let i = 0; i < EXTENDED_FIELD_COUNT; i++) {
    const dataType = EXTENDED_FIELD_TYPES[i % EXTENDED_FIELD_TYPES.length];
    const fieldName = `field_${i}_as_${dataType}`;
    const runtimeType = RUNTIME_TYPE_MAP[dataType];
    const sourcePath = `params._source['cases']['extended_fields']['${fieldName}']`;

    let emitExpression: string;
    switch (dataType) {
      case 'date':
        emitExpression = `emit(ZonedDateTime.parse(v.toString()).toInstant().toEpochMilli())`;
        break;
      case 'boolean':
        emitExpression = `emit(Boolean.parseBoolean(v.toString()))`;
        break;
      case 'long':
      case 'integer':
        emitExpression = `emit(((Number)v).longValue())`;
        break;
      case 'float':
        emitExpression = `emit(((Number)v).doubleValue())`;
        break;
      default: // keyword, ip, text
        emitExpression = `emit(v.toString())`;
        break;
    }

    runtime[`cases.extended_runtime.${fieldName}`] = {
      type: runtimeType,
      script: {
        source: `def v = ${sourcePath}; if (v != null) { ${emitExpression}; }`,
      },
    };
  }

  return runtime;
}

export class CasesService {
  private readonly log: Logger;
  private readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;
  private readonly attachmentService: AttachmentService;
  private readonly esClient: ElasticsearchClient;

  constructor({
    log,
    unsecuredSavedObjectsClient,
    attachmentService,
    esClient,
  }: {
    log: Logger;
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
    attachmentService: AttachmentService;
    esClient: ElasticsearchClient;
  }) {
    this.log = log;
    this.unsecuredSavedObjectsClient = unsecuredSavedObjectsClient;
    this.attachmentService = attachmentService;
    this.esClient = esClient;
  }

  /**
   * Real-time analytics sync: triggers a targeted reindex of a single case SO into
   * the content analytics index using the stored Painless script.
   * Fire-and-forget — HTTP-level errors are logged as warnings and never propagated to the caller.
   * The reindex runs asynchronously inside an ES task (wait_for_completion: false), so errors
   * such as index_not_found are handled by ES and do not surface here.
   */
  public syncCaseToAnalyticsContentIndex(caseId: string, owner: string, spaceId: string): void {
    const destIndex = getContentIndexName(owner, spaceId);
    const sourceDocId = `${CASE_SAVED_OBJECT}:${caseId}`;
    void this.esClient
      .reindex({
        source: {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          query: { ids: { values: [sourceDocId] } },
        },
        dest: { index: destIndex },
        script: { id: CAI_CONTENT_INDEX_SCRIPT_ID },
        conflicts: 'proceed',
        wait_for_completion: false,
      })
      .then(() => {
        this.log.debug(`[CAI] Real-time sync succeeded for case ${caseId} → "${destIndex}"`);
      })
      .catch((err: Error) => {
        this.log.warn(
          `[CAI] Real-time sync failed for case ${caseId} → "${destIndex}": ${err.message}`
        );
      });
  }

  /**
   * Real-time analytics delete: removes case documents from the content analytics index.
   * Fire-and-forget — 404s (analytics not enabled / already deleted) are silently ignored.
   */
  public deleteCasesFromAnalyticsContentIndex(
    caseIds: string[],
    owner: string,
    spaceId: string
  ): void {
    const destIndex = getContentIndexName(owner, spaceId);
    for (const caseId of caseIds) {
      const docId = `${CASE_SAVED_OBJECT}:${caseId}`;
      void this.esClient
        .delete({ index: destIndex, id: docId, refresh: true })
        .catch((err: Error & { statusCode?: number }) => {
          if (err.statusCode !== 404) {
            this.log.warn(
              `[CAI] Real-time delete failed for case ${caseId} in "${destIndex}": ${err.message}`
            );
          }
        });
    }
  }

  private buildCaseIdsAggs = (
    size: number = 100
  ): Record<string, estypes.AggregationsAggregationContainer> => ({
    references: {
      nested: {
        path: `${CASE_COMMENT_SAVED_OBJECT}.references`,
      },
      aggregations: {
        caseIds: {
          terms: {
            field: `${CASE_COMMENT_SAVED_OBJECT}.references.id`,
            size,
          },
        },
      },
    },
  });

  public async getCaseIdsByAlertId({
    alertId,
    filter,
  }: GetCaseIdsByAlertIdArgs): Promise<
    SavedObjectsFindResponse<{ owner: string }, GetCaseIdsByAlertIdAggs>
  > {
    try {
      this.log.debug(`Attempting to GET all cases for alert id ${alertId}`);
      const combinedFilter = combineFilters([
        nodeBuilder.is(`${CASE_COMMENT_SAVED_OBJECT}.attributes.alertId`, alertId),
        filter,
      ]);

      const response = await this.unsecuredSavedObjectsClient.find<
        { owner: string },
        GetCaseIdsByAlertIdAggs
      >({
        type: CASE_COMMENT_SAVED_OBJECT,
        fields: includeFieldsRequiredForAuthentication(),
        page: 1,
        perPage: 1,
        sortField: defaultSortField,
        aggs: this.buildCaseIdsAggs(MAX_DOCS_PER_PAGE),
        filter: combinedFilter,
      });

      const owners: Array<SavedObjectsFindResult<{ owner: string }>> = [];
      for (const so of response.saved_objects) {
        const validatedAttributes = decodeOrThrow(OwnerRt)(so.attributes);

        owners.push(Object.assign(so, { attributes: validatedAttributes }));
      }

      return Object.assign(response, { saved_objects: owners });
    } catch (error) {
      this.log.error(`Error on GET all cases for alert id ${alertId}: ${error}`);
      throw error;
    }
  }

  /**
   * Extracts the case IDs from the alert aggregation
   */
  public static getCaseIDsFromAlertAggs(
    result: SavedObjectsFindResponse<unknown, GetCaseIdsByAlertIdAggs>
  ): string[] {
    return result.aggregations?.references.caseIds.buckets.map((b) => b.key) ?? [];
  }

  public async getCaseIdsByAttachmentSearch(
    namespaces: string[],
    search?: string,
    searchFields?: string[]
  ): Promise<string[]> {
    const attachmentSearchFields = searchFields?.filter((field) =>
      DEFAULT_ATTACHMENT_SEARCH_FIELDS.includes(field)
    );
    if (!search || !attachmentSearchFields?.length) {
      return [];
    }

    const response = await this.searchCases({
      type: [CASE_COMMENT_SAVED_OBJECT],
      namespaces,
      query: {
        bool: {
          should: [
            ...attachmentSearchFields.map((field) => ({
              // use match instead of term to support non-keyword search for fields like comments
              match: {
                [field]: search,
              },
            })),
          ],
        },
      },
    });

    const references = response?.hits?.hits?.map((hit) => hit?._source?.references).flat();
    if (!references) {
      return [];
    }
    return references
      .filter((ref) => ref?.type === 'cases' && ref?.id !== undefined)
      .map((ref) => ref?.id ?? '');
  }

  /**
   * Returns a map of all cases.
   */
  public async findCasesGroupedByID({
    caseOptions,
  }: {
    caseOptions: SavedObjectFindOptionsKueryNode;
  }): Promise<CasesMapWithPageInfo> {
    const cases = await this.findCases(caseOptions);

    const casesMap = cases.saved_objects.reduce((accMap, caseInfo) => {
      accMap.set(caseInfo.id, caseInfo);
      return accMap;
    }, new Map<string, SavedObjectsFindResult<CaseTransformedAttributes>>());

    const commentTotals = await this.attachmentService.getter.getCaseAttatchmentStats({
      caseIds: Array.from(casesMap.keys()),
    });

    const casesWithComments = new Map<string, Case>();
    for (const [id, caseInfo] of casesMap.entries()) {
      const { alerts, userComments, events } = commentTotals.get(id) ?? {
        alerts: 0,
        userComments: 0,
        events: 0,
      };

      casesWithComments.set(
        id,
        flattenCaseSavedObject({
          savedObject: caseInfo,
          totalComment: userComments,
          totalAlerts: alerts,
          totalEvents: events,
        })
      );
    }

    return {
      casesMap: casesWithComments,
      page: cases.page,
      perPage: cases.per_page,
      total: cases.total,
    };
  }

  /**
   * Returns a map of all cases.
   */
  public async searchCasesGroupedByID({
    caseOptions,
    namespaces,
  }: {
    caseOptions: SavedObjectFindOptionsKueryNode;
    namespaces: string[];
  }): Promise<CasesMapWithPageInfo> {
    const caseIdsByAttachmentSearch = await this.getCaseIdsByAttachmentSearch(
      namespaces,
      caseOptions.search,
      caseOptions.searchFields
    );
    const searchQuery = constructSearchQuery({
      search: caseOptions.search,
      searchFields: caseOptions.searchFields,
      caseIds: caseIdsByAttachmentSearch,
    });

    const filterQuery = caseOptions.filter ? toElasticsearchQuery(caseOptions.filter) : undefined;
    const query = mergeSearchQuery(searchQuery, filterQuery);

    const cases = await this.searchCases({
      type: [CASE_SAVED_OBJECT],
      namespaces,
      query,
      ...convertFindQueryParams(caseOptions),
    });

    const casesMap = cases?.hits?.hits?.reduce((accMap, caseInfo) => {
      // Extract UUID from _id format: "cases:uuid"
      if (caseInfo._id && caseInfo._id.startsWith(`${CASE_SAVED_OBJECT}:`)) {
        const caseId = caseInfo._id.split(':')[1];
        const caseData = caseInfo._source?.cases;
        if (caseData) {
          accMap.set(caseId, transformESModelToCase(caseId, caseData, caseInfo));
        }
      }
      return accMap;
    }, new Map<string, Case>());

    // TODO: imported cases do not populate stats when importing
    // Remove once https://github.com/elastic/kibana/issues/245939 is fixed
    const commentTotals = await this.attachmentService.getter.getCaseAttatchmentStats({
      caseIds: Array.from(casesMap.keys()),
    });

    const casesWithComments = new Map<string, Case>();
    for (const [id, caseInfo] of casesMap.entries()) {
      const { alerts, userComments, events } = commentTotals.get(id) ?? {
        alerts: 0,
        userComments: 0,
        events: 0,
      };

      casesWithComments.set(id, {
        ...caseInfo,
        totalComment: userComments,
        totalAlerts: alerts,
        totalEvents: events,
      });
    }
    const total =
      typeof cases.hits.total === 'object' ? cases.hits.total.value ?? 0 : cases.hits.total ?? 0;

    return {
      casesMap: casesWithComments,
      page: caseOptions.page ?? 1,
      perPage: caseOptions.perPage ?? DEFAULT_PER_PAGE,
      total,
    };
  }

  public async getCaseStatusStats({
    searchOptions,
  }: {
    searchOptions: SavedObjectFindOptionsKueryNode;
  }): Promise<{
    [status in CaseStatuses]: number;
  }> {
    const cases = await this.unsecuredSavedObjectsClient.find<
      unknown,
      {
        statuses: {
          buckets: Array<{
            key: string;
            doc_count: number;
          }>;
        };
      }
    >({
      ...searchOptions,
      type: CASE_SAVED_OBJECT,
      perPage: 0,
      aggs: {
        statuses: {
          terms: {
            field: `${CASE_SAVED_OBJECT}.attributes.status`,
            size: caseStatuses.length,
            order: { _key: 'asc' },
          },
        },
      },
    });

    const statusBuckets = CasesService.getStatusBuckets(cases.aggregations?.statuses.buckets);
    return {
      open: statusBuckets?.get(CasePersistedStatus.OPEN) ?? 0,
      'in-progress': statusBuckets?.get(CasePersistedStatus.IN_PROGRESS) ?? 0,
      closed: statusBuckets?.get(CasePersistedStatus.CLOSED) ?? 0,
    };
  }

  private static getStatusBuckets(
    buckets: Array<{ key: string; doc_count: number }> | undefined
  ): Map<number, number> | undefined {
    return buckets?.reduce((acc, bucket) => {
      acc.set(Number(bucket.key), bucket.doc_count);
      return acc;
    }, new Map<number, number>());
  }

  public async deleteCase({ id: caseId, refresh }: DeleteCaseArgs) {
    try {
      this.log.debug(`Attempting to DELETE case ${caseId}`);
      await this.unsecuredSavedObjectsClient.delete(CASE_SAVED_OBJECT, caseId, { refresh });
    } catch (error) {
      this.log.error(`Error on DELETE case ${caseId}: ${error}`);
      throw error;
    }
  }

  public async bulkDeleteCaseEntities({
    entities,
    options,
  }: {
    entities: SavedObjectsBulkDeleteObject[];
    options?: SavedObjectsBulkDeleteOptions;
  }) {
    try {
      this.log.debug(() => `Attempting to bulk delete case entities ${JSON.stringify(entities)}`);
      await this.unsecuredSavedObjectsClient.bulkDelete(entities, options);
    } catch (error) {
      this.log.error(`Error bulk deleting case entities ${JSON.stringify(entities)}: ${error}`);
    }
  }

  public async getCase({ id: caseId }: GetCaseArgs): Promise<CaseSavedObjectTransformed> {
    try {
      this.log.debug(`Attempting to GET case ${caseId}`);
      const caseSavedObject = await this.unsecuredSavedObjectsClient.get<CasePersistedAttributes>(
        CASE_SAVED_OBJECT,
        caseId
      );

      const res = transformSavedObjectToExternalModel(caseSavedObject);
      const decodeRes = decodeOrThrow(CaseTransformedAttributesRt)(res.attributes);

      return {
        ...res,
        attributes: decodeRes,
      };
    } catch (error) {
      this.log.error(`Error on GET case ${caseId}: ${error}`);
      throw error;
    }
  }

  public async getResolveCase({
    id: caseId,
  }: GetCaseArgs): Promise<SavedObjectsResolveResponse<CaseTransformedAttributes>> {
    try {
      this.log.debug(`Attempting to resolve case ${caseId}`);
      const resolveCaseResult =
        await this.unsecuredSavedObjectsClient.resolve<CasePersistedAttributes>(
          CASE_SAVED_OBJECT,
          caseId
        );

      const resolvedSO = transformSavedObjectToExternalModel(resolveCaseResult.saved_object);
      const decodeRes = decodeOrThrow(CaseTransformedAttributesRt)(resolvedSO.attributes);

      return {
        ...resolveCaseResult,
        saved_object: { ...resolvedSO, attributes: decodeRes },
      };
    } catch (error) {
      this.log.error(`Error on resolve case ${caseId}: ${error}`);
      throw error;
    }
  }

  public async getCases({
    caseIds,
  }: GetCasesArgs): Promise<SavedObjectsBulkResponseWithErrors<CaseTransformedAttributes>> {
    try {
      this.log.debug(`Attempting to GET cases ${caseIds.join(', ')}`);
      const cases = await this.unsecuredSavedObjectsClient.bulkGet<CasePersistedAttributes>(
        caseIds.map((caseId) => ({ type: CASE_SAVED_OBJECT, id: caseId }))
      );

      const res = cases.saved_objects.map((theCase) => {
        if (isSOError(theCase)) {
          return theCase;
        }

        const so = Object.assign(theCase, transformSavedObjectToExternalModel(theCase));
        const decodeRes = decodeOrThrow(CaseTransformedAttributesRt)(so.attributes);
        const soWithDecodedRes = Object.assign(so, { attributes: decodeRes });

        return soWithDecodedRes;
      });

      return Object.assign(cases, {
        saved_objects: res,
      });
    } catch (error) {
      this.log.error(`Error on GET cases ${caseIds.join(', ')}: ${error}`);
      throw error;
    }
  }

  public async findCases(
    options?: SavedObjectFindOptionsKueryNode
  ): Promise<SavedObjectsFindResponse<CaseTransformedAttributes>> {
    try {
      this.log.debug(`Attempting to find cases`);
      const cases = await this.unsecuredSavedObjectsClient.find<CasePersistedAttributes>({
        sortField: defaultSortField,
        ...options,
        type: CASE_SAVED_OBJECT,
      });

      const res = transformFindResponseToExternalModel(cases);
      const decodeRes = bulkDecodeSOAttributes(res.saved_objects, CaseTransformedAttributesRt);

      return {
        ...res,
        saved_objects: res.saved_objects.map((so) => ({
          ...so,
          attributes: decodeRes.get(so.id) as CaseTransformedAttributes,
        })),
      };
    } catch (error) {
      this.log.error(`Error on find cases: ${error}`);
      throw error;
    }
  }

  public async searchCases({
    type,
    namespaces,
    query,
    ...options
  }: SavedObjectsSearchOptions): Promise<SavedObjectsSearchResponse> {
    try {
      this.log.debug(`Attempting to search cases`);
      const cases = await this.unsecuredSavedObjectsClient.search({
        type,
        namespaces,
        query,
        seq_no_primary_term: true,
        ...options,
      });

      return cases;
    } catch (error) {
      this.log.error(`Error on search cases: ${error}`);
      throw error;
    }
  }

  private asArray(id: string | string[] | undefined): string[] {
    if (id === undefined) {
      return [];
    } else if (Array.isArray(id)) {
      return id;
    } else {
      return [id];
    }
  }

  // TODO: This should probably be moved into the client since it is after the transform has
  // occurred within the attachment service
  private async getAllComments({
    id,
    options,
  }: FindCommentsArgs): Promise<SavedObjectsFindResponse<AttachmentTransformedAttributes>> {
    try {
      this.log.debug(`Attempting to GET all comments internal for id ${JSON.stringify(id)}`);
      if (options?.page !== undefined || options?.perPage !== undefined) {
        return this.attachmentService.find({
          options: {
            sortField: defaultSortField,
            ...options,
          },
        });
      }

      return this.attachmentService.find({
        options: {
          page: 1,
          perPage: MAX_DOCS_PER_PAGE,
          sortField: defaultSortField,
          ...options,
        },
      });
    } catch (error) {
      this.log.error(`Error on GET all comments internal for ${JSON.stringify(id)}: ${error}`);
      throw error;
    }
  }

  // TODO: This should probably be moved into the client since it is after the transform has
  // occurred within the attachment service
  /**
   * Default behavior is to retrieve all comments that adhere to a given filter (if one is included).
   * to override this pass in the either the page or perPage options.
   */
  public async getAllCaseComments({
    id,
    options,
  }: FindCaseCommentsArgs): Promise<SavedObjectsFindResponse<AttachmentTransformedAttributes>> {
    try {
      const refs = this.asArray(id).map((caseID) => ({ type: CASE_SAVED_OBJECT, id: caseID }));
      if (refs.length <= 0) {
        return {
          saved_objects: [],
          total: 0,
          per_page: options?.perPage ?? DEFAULT_PER_PAGE,
          page: options?.page ?? DEFAULT_PAGE,
        };
      }

      this.log.debug(`Attempting to GET all comments for case caseID ${JSON.stringify(id)}`);
      return await this.getAllComments({
        id,
        options: {
          hasReferenceOperator: 'OR',
          hasReference: refs,
          filter: options?.filter,
          ...options,
        },
      });
    } catch (error) {
      this.log.error(`Error on GET all comments for case ${JSON.stringify(id)}: ${error}`);
      throw error;
    }
  }

  public async getReporters({ filter }: GetReportersArgs): Promise<User[]> {
    try {
      this.log.debug(`Attempting to GET all reporters`);

      const results = await this.unsecuredSavedObjectsClient.find<
        unknown,
        {
          reporters: {
            buckets: Array<{
              key: string;
              top_docs: { hits: { hits: Array<{ _source: { cases: { created_by: User } } }> } };
            }>;
          };
        }
      >({
        type: CASE_SAVED_OBJECT,
        page: 1,
        perPage: 1,
        filter,
        aggs: {
          reporters: {
            terms: {
              field: `${CASE_SAVED_OBJECT}.attributes.created_by.username`,
              size: MAX_DOCS_PER_PAGE,
              order: { _key: 'asc' },
            },
            aggs: {
              top_docs: {
                top_hits: {
                  sort: [
                    {
                      [`${CASE_SAVED_OBJECT}.created_at`]: {
                        order: 'desc',
                      },
                    },
                  ],
                  size: 1,
                  _source: [`${CASE_SAVED_OBJECT}.created_by`],
                },
              },
            },
          },
        },
      });

      return (
        results?.aggregations?.reporters?.buckets.map(({ key: username, top_docs: topDocs }) => {
          const user = topDocs?.hits?.hits?.[0]?._source?.cases?.created_by ?? {};
          return {
            username,
            full_name: user.full_name ?? null,
            email: user.email ?? null,
            profile_uid: user.profile_uid,
          };
        }) ?? []
      );
    } catch (error) {
      this.log.error(`Error on GET all reporters: ${error}`);
      throw error;
    }
  }

  public async getTags({ filter }: GetTagsArgs): Promise<string[]> {
    try {
      this.log.debug(`Attempting to GET all cases`);

      const results = await this.unsecuredSavedObjectsClient.find<
        unknown,
        { tags: { buckets: Array<{ key: string }> } }
      >({
        type: CASE_SAVED_OBJECT,
        page: 1,
        perPage: 1,
        filter,
        aggs: {
          tags: {
            terms: {
              field: `${CASE_SAVED_OBJECT}.attributes.tags`,
              size: MAX_DOCS_PER_PAGE,
              order: { _key: 'asc' },
            },
          },
        },
      });

      return results?.aggregations?.tags?.buckets.map(({ key }) => key) ?? [];
    } catch (error) {
      this.log.error(`Error on GET tags: ${error}`);
      throw error;
    }
  }

  public async getCategories({ filter }: GetCategoryArgs): Promise<string[]> {
    try {
      this.log.debug(`Attempting to GET all categories`);

      const results = await this.unsecuredSavedObjectsClient.find<
        unknown,
        { categories: { buckets: Array<{ key: string }> } }
      >({
        type: CASE_SAVED_OBJECT,
        page: 1,
        perPage: 1,
        filter,
        aggs: {
          categories: {
            terms: {
              field: `${CASE_SAVED_OBJECT}.attributes.category`,
              size: MAX_DOCS_PER_PAGE,
              order: { _key: 'asc' },
            },
          },
        },
      });

      return results?.aggregations?.categories?.buckets.map(({ key }) => key) ?? [];
    } catch (error) {
      this.log.error(`Error on GET categories: ${error}`);
      throw error;
    }
  }

  public async createCase({
    attributes,
    id,
    refresh,
  }: CreateCaseArgs): Promise<CaseSavedObjectTransformed> {
    try {
      this.log.debug(`Attempting to create a new case`);

      const decodedAttributes = decodeOrThrow(CaseTransformedAttributesRt)(attributes);
      const transformedAttributes = transformAttributesToESModel(decodedAttributes);

      transformedAttributes.attributes.total_alerts = 0;
      transformedAttributes.attributes.total_comments = 0;
      transformedAttributes.attributes.total_events = 0;

      transformedAttributes.attributes.extended_fields = {};

      const typeOptions = ['keyword', 'boolean', 'date', 'ip', 'text', 'long', 'integer', 'float'];
      const sampleIps = ['192.168.1.1', '10.0.0.1', '172.16.0.1', '8.8.8.8', '255.255.255.0'];

      for (let i = 0; i < 200; i++) {
        const mappingType = typeOptions[i % typeOptions.length];
        const value: string | number | boolean =
          mappingType === 'keyword'
            ? `keyword_value_${i}`
            : mappingType === 'boolean'
            ? i % 2 === 0
            : mappingType === 'date'
            ? new Date(Date.now() - i * 86400000).toISOString()
            : mappingType === 'ip'
            ? sampleIps[i % sampleIps.length]
            : mappingType === 'text'
            ? `This is sample text content for field ${i}`
            : mappingType === 'long'
            ? i * 100000
            : mappingType === 'integer'
            ? i * 2
            : i * 1.5; // float

        transformedAttributes.attributes.extended_fields[`field_${i}_as_${mappingType}`] = value;
      }

      // await this.esClient.indices.putMapping({
      //   index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      //   runtime: generateExtendedFieldsRuntimeMappings(),
      // });

      const createdCase = await this.unsecuredSavedObjectsClient.create<CasePersistedAttributes>(
        CASE_SAVED_OBJECT,
        transformedAttributes.attributes,
        { id, references: transformedAttributes.referenceHandler.build(), refresh }
      );

      const res = transformSavedObjectToExternalModel(createdCase);
      const decodedRes = decodeOrThrow(CaseTransformedAttributesRt)(res.attributes);

      return { ...res, attributes: decodedRes };
    } catch (error) {
      this.log.error(`Error on creating a new case: ${error}`);
      throw error;
    }
  }

  public async bulkCreateCases({
    cases,
    refresh,
  }: BulkCreateCasesArgs): Promise<SavedObjectsBulkResponseWithErrors<CaseTransformedAttributes>> {
    try {
      this.log.debug(`Attempting to bulk create cases`);

      const bulkCreateRequest = cases.map(({ id, ...attributes }) => {
        const decodedAttributes = decodeOrThrow(CaseTransformedAttributesRt)(attributes);

        const { attributes: transformedAttributes, referenceHandler } =
          transformAttributesToESModel(decodedAttributes);

        transformedAttributes.total_alerts = 0;
        transformedAttributes.total_comments = 0;
        transformedAttributes.total_events = 0;

        return {
          type: CASE_SAVED_OBJECT,
          id,
          attributes: transformedAttributes,
          references: referenceHandler.build(),
        };
      });

      const bulkCreateResponse =
        await this.unsecuredSavedObjectsClient.bulkCreate<CasePersistedAttributes>(
          bulkCreateRequest,
          {
            refresh,
          }
        );

      const res = bulkCreateResponse.saved_objects.map((theCase) => {
        if (isSOError<CasePersistedAttributes>(theCase)) {
          return theCase;
        }

        const transformedCase = transformSavedObjectToExternalModel(theCase);
        const decodedRes = decodeOrThrow(CaseTransformedAttributesRt)(transformedCase.attributes);

        return { ...transformedCase, attributes: decodedRes };
      });

      return { saved_objects: res };
    } catch (error) {
      this.log.error(`Case Service: Error on bulk creating cases: ${error}`);
      throw error;
    }
  }

  public async patchCase({
    caseId,
    updatedAttributes,
    originalCase,
    version,
    refresh,
  }: PatchCaseArgs): Promise<SavedObjectsUpdateResponse<CaseTransformedAttributes>> {
    try {
      this.log.debug(`Attempting to UPDATE case ${caseId}`);

      const decodedAttributes = decodeOrThrow(PartialCaseTransformedAttributesRt)(
        updatedAttributes
      );
      const transformedAttributes = transformAttributesToESModel(decodedAttributes);

      const updatedCase = await this.unsecuredSavedObjectsClient.update<CasePersistedAttributes>(
        CASE_SAVED_OBJECT,
        caseId,
        transformedAttributes.attributes,
        {
          version,
          references: transformedAttributes.referenceHandler.build(originalCase.references),
          refresh,
        }
      );

      const res = transformUpdateResponseToExternalModel(updatedCase);
      const decodeRes = decodeOrThrow(PartialCaseTransformedAttributesRt)(res.attributes);

      return {
        ...res,
        attributes: decodeRes,
      };
    } catch (error) {
      this.log.error(`Error on UPDATE case ${caseId}: ${error}`);
      throw error;
    }
  }

  public async patchCases({
    cases,
    refresh,
  }: PatchCasesArgs): Promise<SavedObjectsBulkUpdateResponse<CaseTransformedAttributes>> {
    try {
      this.log.debug(`Attempting to UPDATE case ${cases.map((c) => c.caseId).join(', ')}`);

      const bulkUpdate = cases.map(({ caseId, updatedAttributes, version, originalCase }) => {
        const decodedAttributes = decodeOrThrow(PartialCaseTransformedAttributesRt)(
          updatedAttributes
        );

        const { attributes, referenceHandler } = transformAttributesToESModel(decodedAttributes);
        return {
          type: CASE_SAVED_OBJECT,
          id: caseId,
          attributes,
          references: referenceHandler.build(originalCase.references),
          version,
        };
      });

      const updatedCases =
        await this.unsecuredSavedObjectsClient.bulkUpdate<CasePersistedAttributes>(bulkUpdate, {
          refresh,
        });

      const res = updatedCases.saved_objects.reduce((acc, theCase) => {
        if (isSOError(theCase)) {
          acc.push(theCase);
          return acc;
        }

        const so = Object.assign(theCase, transformUpdateResponseToExternalModel(theCase));
        const decodeRes = decodeOrThrow(PartialCaseTransformedAttributesRt)(so.attributes);
        const soWithDecodedRes = Object.assign(so, { attributes: decodeRes });

        acc.push(soWithDecodedRes);

        return acc;
      }, [] as Array<SavedObjectsUpdateResponse<CaseTransformedAttributes> | SOWithErrors<CaseTransformedAttributes>>);

      return Object.assign(updatedCases, {
        saved_objects: res,
        /**
         * The case is needed here because
         * the SavedObjectsBulkUpdateResponse is wrong.
         * It assumes that the attributes exist
         * on an error which is not true.
         */
      }) as SavedObjectsBulkUpdateResponse<CaseTransformedAttributes>;
    } catch (error) {
      this.log.error(`Error on UPDATE case ${cases.map((c) => c.caseId).join(', ')}: ${error}`);
      throw error;
    }
  }

  public async executeAggregations({
    aggregationBuilders,
    options,
  }: {
    aggregationBuilders: Array<AggregationBuilder<unknown>>;
    options?: Omit<SavedObjectsFindOptions, 'aggs' | 'type'>;
  }): Promise<AggregationResponse> {
    try {
      const builtAggs = aggregationBuilders.reduce((acc, agg) => {
        return Object.assign(acc, agg.build());
      }, {});

      const res = await this.unsecuredSavedObjectsClient.find<
        CasePersistedAttributes,
        AggregationResponse
      >({
        sortField: defaultSortField,
        ...options,
        aggs: builtAggs,
        type: CASE_SAVED_OBJECT,
      });

      return res.aggregations;
    } catch (error) {
      const aggregationNames = aggregationBuilders.map((agg) => agg.getName());

      throw createCaseError({
        message: `Failed to execute aggregations [${aggregationNames.join(',')}]: ${error}`,
        error,
        logger: this.log,
      });
    }
  }
}

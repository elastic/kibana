import type { Logger, SavedObjectsClientContract, SavedObjectsFindResponse, SavedObjectsBulkUpdateResponse, SavedObjectsUpdateResponse, SavedObjectsResolveResponse, SavedObjectsFindOptions, SavedObjectsBulkDeleteObject, SavedObjectsBulkDeleteOptions } from '@kbn/core/server';
import type { SavedObjectsSearchOptions, SavedObjectsSearchResponse } from '@kbn/core-saved-objects-api-server';
import type { CaseStatuses, User, AttachmentAttributesV2 } from '../../../common/types/domain';
import type { SavedObjectFindOptionsKueryNode, SavedObjectsBulkResponseWithErrors } from '../../common/types';
import type { AttachmentService } from '../attachments';
import type { AggregationBuilder, AggregationResponse } from '../../client/metrics/types';
import type { ResolvedExtendedFieldFilter, ResolvedFieldLabelFilter } from './extended_field_search_utils';
import type { CaseSavedObjectTransformed, CaseTransformedAttributes } from '../../common/types/case';
import type { GetCaseIdsByAlertIdArgs, GetCaseIdsByAlertIdAggs, CasesMapWithPageInfo, DeleteCaseArgs, GetCaseArgs, GetCasesArgs, FindCaseCommentsArgs, GetReportersArgs, GetTagsArgs, CreateCaseArgs, PatchCaseArgs, PatchCasesArgs, GetCategoryArgs, BulkCreateCasesArgs } from './types';
export declare class CasesService {
    private readonly log;
    private readonly unsecuredSavedObjectsClient;
    private readonly attachmentService;
    constructor({ log, unsecuredSavedObjectsClient, attachmentService, }: {
        log: Logger;
        unsecuredSavedObjectsClient: SavedObjectsClientContract;
        attachmentService: AttachmentService;
    });
    private buildCaseIdsAggs;
    getCaseIdsByAlertId({ alertId, filter, unifiedFilter, }: GetCaseIdsByAlertIdArgs): Promise<SavedObjectsFindResponse<{
        owner: string;
    }, GetCaseIdsByAlertIdAggs>>;
    /**
     * Runs the per-saved-object-type alert→case lookup. Each saved-object type uses
     * its own nested-aggregation path (`<soType>.references`), so legacy and unified
     * attachments cannot share a single `find` aggregation; they are issued as
     * sibling queries and merged by `getCaseIdsByAlertId`.
     */
    private findCaseIdsForAlertByType;
    /**
     * Extracts the case IDs from the alert aggregation
     */
    static getCaseIDsFromAlertAggs(result: SavedObjectsFindResponse<unknown, GetCaseIdsByAlertIdAggs>): string[];
    getCaseIdsByAttachmentSearch(namespaces: string[], search?: string, searchFields?: string[]): Promise<string[]>;
    /**
     * Returns a map of all cases.
     */
    findCasesGroupedByID({ caseOptions, }: {
        caseOptions: SavedObjectFindOptionsKueryNode;
    }): Promise<CasesMapWithPageInfo>;
    /**
     * Returns a map of all cases.
     */
    searchCasesGroupedByID({ caseOptions, namespaces, extendedFieldFilters, fieldLabelFilters, }: {
        caseOptions: SavedObjectFindOptionsKueryNode;
        namespaces: string[];
        extendedFieldFilters?: ResolvedExtendedFieldFilter[][];
        fieldLabelFilters?: ResolvedFieldLabelFilter[];
    }): Promise<CasesMapWithPageInfo>;
    getCaseStatusStats({ searchOptions, }: {
        searchOptions: SavedObjectFindOptionsKueryNode;
    }): Promise<{
        [status in CaseStatuses]: number;
    }>;
    private static getStatusBuckets;
    deleteCase({ id: caseId, refresh }: DeleteCaseArgs): Promise<void>;
    bulkDeleteCaseEntities({ entities, options, }: {
        entities: SavedObjectsBulkDeleteObject[];
        options?: SavedObjectsBulkDeleteOptions;
    }): Promise<void>;
    getCase({ id: caseId }: GetCaseArgs): Promise<CaseSavedObjectTransformed>;
    getResolveCase({ id: caseId, }: GetCaseArgs): Promise<SavedObjectsResolveResponse<CaseTransformedAttributes>>;
    getCases({ caseIds, }: GetCasesArgs): Promise<SavedObjectsBulkResponseWithErrors<CaseTransformedAttributes>>;
    findCases(options?: SavedObjectFindOptionsKueryNode): Promise<SavedObjectsFindResponse<CaseTransformedAttributes>>;
    searchCases({ type, namespaces, query, ...options }: SavedObjectsSearchOptions): Promise<SavedObjectsSearchResponse>;
    private asArray;
    private getAllComments;
    /**
     * Default behavior is to retrieve all comments that adhere to a given filter (if one is included).
     * to override this pass in the either the page or perPage options.
     */
    getAllCaseComments({ id, options, mode, }: FindCaseCommentsArgs): Promise<SavedObjectsFindResponse<AttachmentAttributesV2>>;
    getReporters({ filter }: GetReportersArgs): Promise<User[]>;
    getTags({ filter }: GetTagsArgs): Promise<string[]>;
    getCategories({ filter }: GetCategoryArgs): Promise<string[]>;
    createCase({ attributes, id, refresh, }: CreateCaseArgs): Promise<CaseSavedObjectTransformed>;
    bulkCreateCases({ cases, refresh, }: BulkCreateCasesArgs): Promise<SavedObjectsBulkResponseWithErrors<CaseTransformedAttributes>>;
    patchCase({ caseId, updatedAttributes, originalCase, version, refresh, }: PatchCaseArgs): Promise<SavedObjectsUpdateResponse<CaseTransformedAttributes>>;
    patchCases({ cases, refresh, }: PatchCasesArgs): Promise<SavedObjectsBulkUpdateResponse<CaseTransformedAttributes>>;
    executeAggregations({ aggregationBuilders, options, }: {
        aggregationBuilders: Array<AggregationBuilder<unknown>>;
        options?: Omit<SavedObjectsFindOptions, 'aggs' | 'type'>;
    }): Promise<AggregationResponse>;
}

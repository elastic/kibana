import type { User } from '../../common/types/domain';
import type { AttachmentRequest, BulkCreateAttachmentsRequestV2, CasePatchRequest, CasePostRequest, CustomFieldPutRequest, AddObservableRequest, UpdateObservableRequest, BulkAddObservablesRequest, UpdateSummary } from '../../common/types/api';
import type { CaseConnectors, CaseUpdateRequest, FetchCasesProps, ResolvedCase, CaseUserActionTypeWithAll, CaseUserActionsStats, CaseUsers, CasesFindResponseUI, CasesUI, CaseUICustomField, SimilarCasesProps, CasesSimilarResponseUI, InternalFindCaseUserActions } from '../../common/ui/types';
import type { ActionLicense, CaseUI, FeatureIdsResponse, SingleCaseMetrics, SingleCaseMetricsFeature } from './types';
export declare const resolveCase: ({ caseId, signal, mode, }: {
    caseId: string;
    signal?: AbortSignal;
    mode?: "legacy" | "unified";
}) => Promise<ResolvedCase>;
export declare const getCase: ({ caseId, signal, }: {
    caseId: string;
    signal?: AbortSignal;
}) => Promise<CaseUI>;
export declare const getTags: ({ owner, signal, }: {
    owner: string[];
    signal?: AbortSignal;
}) => Promise<string[]>;
export declare const getCategories: ({ owner, signal, }: {
    owner: string[];
    signal?: AbortSignal;
}) => Promise<string[]>;
export declare const getReporters: (signal: AbortSignal, owner: string[]) => Promise<User[]>;
export declare const getSingleCaseMetrics: (caseId: string, features: SingleCaseMetricsFeature[], signal?: AbortSignal) => Promise<SingleCaseMetrics>;
export declare const findCasesByAttachmentId: (documentIds: string[], caseIds: string[]) => Promise<{
    casesWithAllAttachments: string[];
}>;
export declare const findCaseUserActions: (caseId: string, params: {
    type: CaseUserActionTypeWithAll;
    sortOrder: "asc" | "desc";
    page: number;
    perPage: number;
}, signal?: AbortSignal) => Promise<InternalFindCaseUserActions>;
export declare const getCaseUserActionsStats: (caseId: string, signal?: AbortSignal) => Promise<CaseUserActionsStats>;
export declare const getCases: ({ filterOptions, queryParams, signal, }: FetchCasesProps) => Promise<CasesFindResponseUI>;
export declare const postCase: ({ newCase, signal, }: {
    newCase: CasePostRequest;
    signal?: AbortSignal;
}) => Promise<CaseUI>;
export declare const patchCase: ({ caseId, updatedCase, version, signal, }: {
    caseId: string;
    updatedCase: Pick<CasePatchRequest, "description" | "status" | "tags" | "title" | "settings" | "connector" | "severity" | "assignees" | "category" | "customFields" | "extended_fields" | "template">;
    version: string;
    signal?: AbortSignal;
}) => Promise<CasesUI>;
export declare const updateCases: ({ cases, signal, }: {
    cases: CaseUpdateRequest[];
    signal?: AbortSignal;
}) => Promise<Array<CaseUI & {
    updateSummary?: UpdateSummary;
}>>;
export declare const replaceCustomField: ({ caseId, customFieldId, request, signal, }: {
    caseId: string;
    customFieldId: string;
    request: CustomFieldPutRequest;
    signal?: AbortSignal;
}) => Promise<CaseUICustomField>;
export declare const postComment: (newComment: AttachmentRequest, caseId: string, signal: AbortSignal) => Promise<CaseUI>;
export declare const patchComment: ({ caseId, commentId, commentUpdate, version, owner, signal, }: {
    caseId: string;
    commentId: string;
    commentUpdate: string;
    version: string;
    owner: string;
    signal?: AbortSignal;
}) => Promise<CaseUI>;
export declare const deleteComment: ({ caseId, commentId, signal, }: {
    caseId: string;
    commentId: string;
    signal?: AbortSignal;
}) => Promise<void>;
export declare const deleteCases: ({ caseIds, signal, }: {
    caseIds: string[];
    signal?: AbortSignal;
}) => Promise<string>;
export declare const pushCase: ({ caseId, connectorId, signal, }: {
    caseId: string;
    connectorId: string;
    signal?: AbortSignal;
}) => Promise<CaseUI>;
export declare const getActionLicense: (signal?: AbortSignal) => Promise<ActionLicense[]>;
export declare const createAttachments: ({ attachments, caseId, signal, }: {
    attachments: BulkCreateAttachmentsRequestV2;
    caseId: string;
    signal?: AbortSignal;
}) => Promise<CaseUI>;
export declare const deleteFileAttachments: ({ caseId, fileIds, signal, }: {
    caseId: string;
    fileIds: string[];
    signal?: AbortSignal;
}) => Promise<void>;
export declare const getFeatureIds: ({ query, signal, }: {
    query: {
        ids: {
            values: string[];
        };
    };
    signal?: AbortSignal;
}) => Promise<FeatureIdsResponse>;
export declare const getCaseConnectors: (caseId: string, signal?: AbortSignal) => Promise<CaseConnectors>;
export declare const getCaseUsers: ({ caseId, signal, }: {
    caseId: string;
    signal?: AbortSignal;
}) => Promise<CaseUsers>;
export declare const postObservable: (request: AddObservableRequest, caseId: string, signal?: AbortSignal) => Promise<CaseUI>;
export declare const patchObservable: (request: UpdateObservableRequest, caseId: string, observableId: string, signal?: AbortSignal) => Promise<CaseUI>;
export declare const deleteObservable: (caseId: string, observableId: string, signal?: AbortSignal) => Promise<void>;
export declare const bulkPostObservables: (request: BulkAddObservablesRequest, signal?: AbortSignal) => Promise<CaseUI>;
export declare const getSimilarCases: ({ caseId, signal, perPage, page, }: SimilarCasesProps) => Promise<CasesSimilarResponseUI>;

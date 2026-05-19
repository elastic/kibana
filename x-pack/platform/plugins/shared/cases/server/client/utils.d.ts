import type { ISavedObjectsSerializer } from '@kbn/core-saved-objects-server';
import type { KueryNode } from '@kbn/es-query';
import type { FileJSON } from '@kbn/shared-ux-file-types';
import type { CustomFieldsConfiguration, TemplatesConfiguration } from '../../common/types/domain';
import type { SavedObjectFindOptionsKueryNode } from '../common/types';
import type { CasesSearchParams } from './types';
import type { ExternalReferenceAttachmentTypeRegistry } from '../attachment_framework/external_reference_registry';
import type { UnifiedAttachmentTypeRegistry } from '../attachment_framework/unified_attachment_registry';
import type { UnifiedAttachmentPayload } from '../../common/types/domain/attachment/v2';
import type { AttachmentRequest, AttachmentRequestV2, CasesFindRequestSortFields } from '../../common/types/api';
export declare const decodeCommentRequest: (comment: AttachmentRequest, externalRefRegistry: ExternalReferenceAttachmentTypeRegistry) => void;
export declare const decodeUnifiedCommentRequest: (attachment: UnifiedAttachmentPayload, unifiedRegistry: UnifiedAttachmentTypeRegistry) => void;
export declare const decodeCommentRequestV2: (attachment: AttachmentRequestV2, externalRefRegistry: ExternalReferenceAttachmentTypeRegistry, unifiedRegistry: UnifiedAttachmentTypeRegistry) => void;
/**
 * Return the alert IDs from the comment if it is an alert style comment. Otherwise return an empty array.
 */
export declare const getAlertIds: (comment: AttachmentRequest) => string[];
export declare const NodeBuilderOperators: {
    readonly and: "and";
    readonly or: "or";
};
type NodeBuilderOperatorsType = keyof typeof NodeBuilderOperators;
interface FilterField {
    filters?: string | string[];
    field: string;
    operator: NodeBuilderOperatorsType;
    type?: string;
}
export declare const buildFilter: ({ filters, field, operator, type, }: FilterField) => KueryNode | undefined;
/**
 * Combines the authorized filters with the requested owners.
 */
export declare const combineAuthorizedAndOwnerFilter: (owner?: string[] | string, authorizationFilter?: KueryNode, savedObjectType?: string) => KueryNode | undefined;
/**
 * Combines Kuery nodes and accepts an array with a mixture of undefined and KueryNodes. This will filter out the undefined
 * filters and return a KueryNode with the filters combined using the specified operator which defaults to and if not defined.
 */
export declare function combineFilters(nodes: Array<KueryNode | undefined>, operator?: NodeBuilderOperatorsType): KueryNode | undefined;
/**
 * Creates a KueryNode from a string expression. Returns undefined if the expression is undefined.
 */
export declare function stringToKueryNode(expression?: string): KueryNode | undefined;
export declare const buildRangeFilter: ({ from, to, field, savedObjectType, }: {
    from?: string;
    to?: string;
    field?: string;
    savedObjectType?: string;
}) => KueryNode | undefined;
export declare const buildAssigneesFilter: ({ assignees, }: {
    assignees: CasesSearchParams["assignees"];
}) => KueryNode | undefined;
export declare const buildCustomFieldsFilter: ({ customFields, customFieldsConfiguration, }: {
    customFields: CasesSearchParams["customFields"];
    customFieldsConfiguration?: CustomFieldsConfiguration;
}) => KueryNode | undefined;
/**
 * Helper function to remove .attributes from field paths in a KueryNode AST.
 * This is used when searchType is 'search' to convert find-style filters to search-style filters.
 */
export declare const removeAttributesFromFilter: (node: KueryNode) => KueryNode;
export declare const constructQueryOptions: ({ tags, reporters, status, severity, sortField, owner, authorizationFilter, from, to, assignees, category, customFields, customFieldsConfiguration, searchType, }: CasesSearchParams & {
    customFieldsConfiguration?: CustomFieldsConfiguration;
    searchType?: "find" | "search";
}) => SavedObjectFindOptionsKueryNode;
interface CompareArrays<T> {
    addedItems: T[];
    deletedItems: T[];
}
export declare const arraysDifference: <T>(originalValue: T[] | undefined | null, updatedValue: T[] | undefined | null) => CompareArrays<T> | null;
interface CaseWithIDVersion {
    id: string;
    version: string;
    [key: string]: unknown;
}
export declare const getCaseToUpdate: (currentCase: unknown, queryCase: CaseWithIDVersion) => CaseWithIDVersion;
/**
 * TODO: Backend is not connected with the
 * frontend in x-pack/platform/plugins/shared/cases/common/ui/types.ts.
 * It is easy to forget to update a sort field.
 * We should fix it and make it common.
 * Also the sortField in x-pack/platform/plugins/shared/cases/common/api/cases/case.ts
 * is set to string. We should narrow it to the
 * acceptable values
 */
declare enum SortFieldCase {
    closedAt = "closed_at",
    createdAt = "created_at",
    status = "status",
    title = "title.keyword",
    severity = "severity",
    updatedAt = "updated_at",
    category = "category"
}
export declare const convertSortField: (sortField: CasesFindRequestSortFields | undefined) => SortFieldCase;
export declare const constructSearch: (search: string | undefined, spaceId: string, savedObjectsSerializer: ISavedObjectsSerializer) => {
    search: string;
    rootSearchFields?: string[];
} | undefined;
/**
 * remove deleted custom field from template or add newly added custom field to template
 */
export declare const transformTemplateCustomFields: ({ templates, customFields, }: {
    templates?: TemplatesConfiguration;
    customFields?: CustomFieldsConfiguration;
}) => TemplatesConfiguration;
export declare const buildObservablesFieldsFilter: (observables: Record<string, string[]>) => KueryNode | undefined;
export declare const buildAttachmentRequestFromFileJSON: ({ owner, fileMetadata, }: {
    owner: string;
    fileMetadata: FileJSON;
}) => AttachmentRequestV2;
export {};

import type { estypes } from '@elastic/elasticsearch';
import type { Template } from '../../../common/types/domain/template/v1';
export interface ExtendedFieldFilter {
    label: string;
    value: string;
}
export interface ResolvedExtendedFieldFilter {
    storageKey: string;
    value: string;
    esType: string;
    control: string;
    templateVersions: Array<{
        id: string;
        version: number;
    }>;
}
export interface LabelSearchToken {
    text: string;
    exact: boolean;
}
export interface ResolvedFieldLabelFilter {
    storageKey: string;
    esType: string;
    control: string;
    templateVersions: Array<{
        id: string;
        version: number;
    }>;
}
export declare const resolveExtendedFieldFilters: (extendedFieldFilters: ExtendedFieldFilter[], templates: Array<Pick<Template, "fieldNames" | "templateId" | "templateVersion">>) => ResolvedExtendedFieldFilter[][];
/** Parses an ISO 8601 date string (YYYY-MM-DD or full ISO timestamp) into a full-day UTC range [gte, lt). */
export declare const parseDateFilterToRange: (value: string) => {
    gte: string;
    lt: string;
} | undefined;
/** Builds ES runtime field mappings only for filters that can't use the flattened mapping directly. */
export declare const buildExtendedFieldRuntimeMappings: (resolvedFilterGroups: ResolvedExtendedFieldFilter[][]) => Record<string, estypes.MappingRuntimeField>;
export declare const buildExtendedFieldFilterClauses: (resolvedFilterGroups: ResolvedExtendedFieldFilter[][]) => estypes.QueryDslQueryContainer[];
/**
 * Parses the search string into tokens for field-label matching.
 * - Quoted phrases ("Start date") become substring-match tokens (exact: false)
 * - Bare words (priority) become exact full-label match tokens (exact: true)
 * Tokens already consumed by label:value syntax should not be present in the input.
 */
export declare const tokenizeSearchForLabels: (search: string) => LabelSearchToken[];
/**
 * Resolves search tokens against template field labels.
 * - exact tokens: full label must equal the token text
 * - substring tokens (quoted): label must contain the token text
 */
export declare const resolveFieldLabelSearch: (tokens: LabelSearchToken[], templates: Array<Pick<Template, "fieldNames" | "templateId" | "templateVersion">>) => ResolvedFieldLabelFilter[];
/** Builds runtime field mappings only for field-label existence queries that need scripts. */
export declare const buildFieldLabelRuntimeMappings: (resolvedLabels: ResolvedFieldLabelFilter[]) => Record<string, estypes.MappingRuntimeField>;
export declare const EF_ALL_VALUES_FIELD: string;
/**
 * Builds a runtime field mapping that tokenizes ALL extended field values
 * on whitespace, enabling word-level partial matching across every extended field.
 */
export declare const buildAllExtendedFieldValuesRuntimeMapping: () => Record<string, estypes.MappingRuntimeField>;
/**
 * Builds ES query clauses that check for the existence of extended fields
 * (field has any value), scoped to the correct template versions.
 * Uses the flattened mapping directly when possible, falling back to
 * runtime fields for controls that need scripts.
 * All clauses are OR'd — any matching label is sufficient.
 */
export declare const buildFieldLabelExistsClauses: (resolvedLabels: ResolvedFieldLabelFilter[]) => estypes.QueryDslQueryContainer[];

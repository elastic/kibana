import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { KueryNode } from '@kbn/es-query';
export declare const NodeBuilderOperators: {
    readonly and: 'and';
    readonly or: 'or';
};
type NodeBuilderOperatorsType = keyof typeof NodeBuilderOperators;
interface FilterField {
    filters?: string | string[];
    field: string;
    operator: NodeBuilderOperatorsType;
    type?: string;
}
export declare const buildFilter: ({ filters, field, operator, type, }: FilterField) => KueryNode | undefined;
export declare const buildRuleTypeIdsFilter: (ruleTypeIds?: string[], type?: string) => KueryNode | undefined;
export declare const buildConsumersFilter: (consumers?: string[], type?: string) => KueryNode | undefined;
export declare const buildTagsFilter: (tags?: string[], type?: string) => KueryNode | undefined;
/**
 * Trim, and treat wrapping quotes as the user trying to phrase-search.
 * Quotes are not operators in a wildcard query.
 */
export declare const sanitizeTemplateSearchQuery: (search?: string) => string | undefined;
/**
 * Escape wildcard metacharacters that are not user-facing operators.
 * Keep `*`. Escape `\` so it cannot neutralize the next character, and `?`
 * so a typed question mark stays literal.
 */
export declare const escapeTemplateSearchWildcard: (value: string) => string;
export declare const buildTemplateSearchWildcardValue: (search?: string) => string | undefined;
/**
 * Substring search on name (wildcard, boost 3), tags (wildcard, boost 2),
 * and description (full-word match, boost 1). Name matches rank highest.
 * Spaces stay spaces; `*` stays a wildcard operator.
 */
export declare const buildTemplateSearchQuery: (search?: string) => QueryDslQueryContainer | undefined;
export declare const stripAttributesFromKueryFields: (node: KueryNode) => KueryNode;
export declare const toSavedObjectEsQuery: (node: KueryNode) => QueryDslQueryContainer;
/**
 * Matches Fleet / alerting v1 rule templates: `engine: "v1"` or no `engine` field.
 * Prefer this allowlist over excluding `"v2"` so future engine values stay out of v1 APIs.
 */
export declare const buildAlertingV1RuleTemplateEngineFilter: (type?: string) => KueryNode;
/**
 * Combines Kuery nodes and accepts an array with a mixture of undefined and KueryNodes. This will filter out the undefined
 * filters and return a KueryNode with the filters combined using the specified operator which defaults to and if not defined.
 */
export declare function combineFilters(nodes: Array<KueryNode | undefined | null>, operator?: NodeBuilderOperatorsType): KueryNode | undefined;
export declare const combineFilterWithAuthorizationFilter: (filter?: KueryNode, authorizationFilter?: KueryNode) => KueryNode | undefined;
export {};

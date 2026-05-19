import type { Agent } from '../../types';
export declare const DEFAULT_NAMESPACES_FILTER = "(namespaces:\"default\" or namespaces:\"*\" or not namespaces:*)";
export declare function isAgentInNamespace(agent: Agent, namespace?: string): Promise<boolean>;
export declare function agentsKueryNamespaceFilter(namespace?: string): Promise<string | undefined>;
/**
 * Safely combines a namespace filter with a user-provided kuery by wrapping
 * each part in parentheses before joining with AND. This prevents KQL operator
 * precedence issues where OR clauses in the user kuery could bypass the
 * namespace filter.
 */
export declare function buildFilterWithNamespace(namespaceFilter: string | undefined, kuery: string | undefined): string | undefined;

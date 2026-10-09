import type { DataViewBase, EsQueryConfig } from '@kbn/es-query';
import type { AlertingV2ScopeAttributes } from '../../data/types';
import type { MaintenanceWindow } from '../types';
type AlertingScopeAttributes = NonNullable<NonNullable<MaintenanceWindow['scope']>['alerting']>;
export interface ScopeInput {
    alerting?: AlertingScopeAttributes;
    alertingV2?: {
        enabled: boolean;
        kql?: string;
    };
}
export interface ResolvedScope {
    alerting?: AlertingScopeAttributes;
    alertingV2?: AlertingV2ScopeAttributes;
}
/**
 * Resolves a requested scope into storage-ready attributes. For alerting v1, compiles the KQL
 * filter into an ES DSL string via buildEsQuery. For alerting v2, performs syntax-only validation
 * (fromKueryExpression) — never compiled to DSL.
 */
export declare const resolveScope: ({ scope, esQueryConfig, indexPattern, errorPrefix, }: {
    scope: ScopeInput;
    esQueryConfig: EsQueryConfig;
    indexPattern: DataViewBase;
    errorPrefix: string;
}) => ResolvedScope;
export {};

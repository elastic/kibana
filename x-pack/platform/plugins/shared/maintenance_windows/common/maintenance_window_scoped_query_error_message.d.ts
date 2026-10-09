declare const VALID_SCOPE_NAMES: readonly ['alerting', 'alertingV2'];
export type MaintenanceWindowScopeName = (typeof VALID_SCOPE_NAMES)[number];
export interface ScopedQueryErrorAttributes {
    scopeErrors: ReadonlyArray<{
        scope: MaintenanceWindowScopeName;
        message: string;
    }>;
}
export declare const getScopedQueryErrorMessage: (errorMessage: string) => string;
export declare const isScopedQueryError: (errorMessage: string) => boolean;
export declare const getScopedQueryErrorAttributes: (scope: MaintenanceWindowScopeName, message: string) => ScopedQueryErrorAttributes;
export declare const isScopedQueryErrorAttributes: (attributes: unknown) => attributes is ScopedQueryErrorAttributes;
export {};

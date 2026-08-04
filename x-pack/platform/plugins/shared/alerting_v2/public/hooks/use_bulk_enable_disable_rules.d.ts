import type { BulkSelection } from './use_bulk_select';
export declare const useBulkEnableRules: () => import("@tanstack/react-query").UseMutationResult<{
    affected_count: number;
    errors: {
        id: string;
        error: {
            message: string;
            code: string;
            details?: Record<string, unknown> | undefined;
        };
    }[];
}, unknown, BulkSelection, unknown>;
export declare const useBulkDisableRules: () => import("@tanstack/react-query").UseMutationResult<{
    affected_count: number;
    errors: {
        id: string;
        error: {
            message: string;
            code: string;
            details?: Record<string, unknown> | undefined;
        };
    }[];
}, unknown, BulkSelection, unknown>;

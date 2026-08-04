import type { BulkSelection } from './use_bulk_select';
export declare const useBulkDeleteRules: () => import("@tanstack/react-query").UseMutationResult<{
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

import type { ServerError } from '../../../types';
import type { BulkDeleteTemplatesResponse } from '../types';
interface MutationArgs {
    templateIds: string[];
}
interface UseBulkDeleteTemplatesProps {
    onSuccess?: () => void;
}
export declare const useBulkDeleteTemplates: ({ onSuccess }?: UseBulkDeleteTemplatesProps) => import("@tanstack/react-query").UseMutationResult<BulkDeleteTemplatesResponse, ServerError, MutationArgs, unknown>;
export {};

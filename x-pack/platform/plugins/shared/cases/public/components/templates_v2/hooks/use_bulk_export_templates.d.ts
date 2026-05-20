import type { ServerError } from '../../../types';
import type { BulkExportTemplatesResponse } from '../types';
interface MutationArgs {
    templateIds: string[];
}
export declare const useBulkExportTemplates: () => import("@kbn/react-query").UseMutationResult<BulkExportTemplatesResponse, ServerError, MutationArgs, unknown>;
export {};

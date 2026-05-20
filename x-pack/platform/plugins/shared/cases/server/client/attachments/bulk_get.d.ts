import type { BulkGetAttachmentsResponseV2 } from '../../../common/types/api';
import type { CasesClientArgs } from '../types';
import type { BulkGetArgs } from './types';
import type { CasesClient } from '../client';
/**
 * Retrieves multiple attachments by id.
 */
export declare function bulkGet({ savedObjectIds, caseID, mode }: BulkGetArgs, clientArgs: CasesClientArgs, casesClient: CasesClient): Promise<BulkGetAttachmentsResponseV2>;

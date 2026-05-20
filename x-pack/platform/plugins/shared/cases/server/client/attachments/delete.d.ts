import type { CasesClientArgs } from '../types';
import type { DeleteAllArgs, DeleteArgs } from './types';
/**
 * Delete all comments for a case.
 */
export declare function deleteAll({ caseID }: DeleteAllArgs, clientArgs: CasesClientArgs): Promise<void>;
/**
 * Deletes an attachment
 */
export declare function deleteComment({ caseID, savedObjectId }: DeleteArgs, clientArgs: CasesClientArgs): Promise<void>;

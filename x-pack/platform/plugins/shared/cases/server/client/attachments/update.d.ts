import type { Case } from '../../../common/types/domain';
import type { CasesClientArgs } from '..';
import type { UpdateArgs } from './types';
/**
 * Update an attachment.
 *
 * @ignore
 */
export declare function update({ caseID, updateRequest: queryParams, mode }: UpdateArgs, clientArgs: CasesClientArgs): Promise<Case>;

import type { Case } from '../../../common/types/domain';
import type { CasesClientArgs } from '..';
import type { AddArgs } from './types';
/**
 * Create an attachment to a case.
 *
 * @ignore
 */
export declare const addComment: (addArgs: AddArgs, clientArgs: CasesClientArgs) => Promise<Case>;

import { type Case } from '../../../common/types/domain';
import type { CasesClient, CasesClientArgs } from '..';
import type { AddFileArgs } from './types';
/**
 * Create a file attachment to a case.
 */
export declare const addFile: (addFileArgs: AddFileArgs, clientArgs: CasesClientArgs, casesClient: CasesClient) => Promise<Case>;

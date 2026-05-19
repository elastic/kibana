import type { FileServiceStart } from '@kbn/files-plugin/server';
import type { CasesDeleteRequest } from '../../../common/types/api';
import type { CasesClientArgs } from '..';
import type { OwnerEntity } from '../../authorization';
/**
 * Deletes the specified cases and their attachments.
 */
export declare function deleteCases(ids: CasesDeleteRequest, clientArgs: CasesClientArgs): Promise<void>;
export declare const getFileEntities: (caseIds: string[], fileService: FileServiceStart) => Promise<OwnerEntity[]>;

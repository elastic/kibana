import * as rt from 'io-ts';
import type { HttpApiPrivilegeOperation, Owner } from '../constants/types';
/**
 * This type is only used to validate for deletion, it does not check all the fields that should exist in the file
 * metadata.
 */
export declare const CaseFileMetadataForDeletionRt: rt.ExactC<rt.TypeC<{
    caseIds: rt.ArrayC<rt.StringC>;
}>>;
export type CaseFileMetadataForDeletion = rt.TypeOf<typeof CaseFileMetadataForDeletionRt>;
export declare const constructFilesHttpOperationPrivilege: (owner: Owner, operation: HttpApiPrivilegeOperation) => string;
export declare const constructFileKindIdByOwner: (owner: Owner) => string;
export declare const constructOwnerFromFileKind: (fileKind: string) => Owner | undefined;

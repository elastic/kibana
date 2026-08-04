import type { SavedObjectsImportAmbiguousConflictError, SavedObjectsImportConflictError } from '@kbn/core/public';
import type { FailedImport, ProcessedImportResponse } from '.';
import type { CopyToSpaceSavedObjectTarget } from '../types';
export interface SummarizedSavedObjectResult {
    type: string;
    id: string;
    name: string;
    icon: string;
    conflict?: FailedImportConflict;
    hasMissingReferences: boolean;
    hasUnresolvableErrors: boolean;
    overwrite: boolean;
}
interface SuccessfulResponse {
    successful: true;
    hasConflicts: false;
    hasMissingReferences: false;
    hasUnresolvableErrors: false;
    objects: SummarizedSavedObjectResult[];
    processing: false;
}
interface UnsuccessfulResponse {
    successful: false;
    hasConflicts: boolean;
    hasMissingReferences: boolean;
    hasUnresolvableErrors: boolean;
    objects: SummarizedSavedObjectResult[];
    processing: false;
}
interface ProcessingResponse {
    objects: SummarizedSavedObjectResult[];
    processing: true;
}
interface FailedImportConflict {
    obj: FailedImport['obj'];
    error: SavedObjectsImportConflictError | SavedObjectsImportAmbiguousConflictError;
}
export type SummarizedCopyToSpaceResult = SuccessfulResponse | UnsuccessfulResponse | ProcessingResponse;
export declare function summarizeCopyResult(savedObjectTarget: Required<CopyToSpaceSavedObjectTarget>, copyResult: ProcessedImportResponse | undefined): SummarizedCopyToSpaceResult;
export {};

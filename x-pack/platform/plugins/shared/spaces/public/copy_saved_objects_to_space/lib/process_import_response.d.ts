import type { SavedObjectsImportAmbiguousConflictError, SavedObjectsImportConflictError, SavedObjectsImportFailure, SavedObjectsImportMissingReferencesError, SavedObjectsImportResponse, SavedObjectsImportSuccess, SavedObjectsImportUnexpectedAccessControlMetadataError, SavedObjectsImportUnknownError, SavedObjectsImportUnsupportedTypeError } from '@kbn/core/public';
export interface FailedImport {
    obj: Omit<SavedObjectsImportFailure, 'error'>;
    error: SavedObjectsImportConflictError | SavedObjectsImportAmbiguousConflictError | SavedObjectsImportUnsupportedTypeError | SavedObjectsImportMissingReferencesError | SavedObjectsImportUnknownError | SavedObjectsImportUnexpectedAccessControlMetadataError;
}
export interface ProcessedImportResponse {
    success: boolean;
    failedImports: FailedImport[];
    successfulImports: SavedObjectsImportSuccess[];
}
export declare function processImportResponse(response: SavedObjectsImportResponse): ProcessedImportResponse;

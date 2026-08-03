import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import type { FileUploadManager } from '../../../../file_upload_manager/file_manager';
interface MappingEdits {
    name: string;
    originalName: string;
    mappingProperty: MappingProperty;
    originalMappingProperty: MappingProperty;
}
interface MappingError {
    message: string;
    errors: Array<{
        nameError: boolean;
        typeError: boolean;
        duplicateError: boolean;
    }>;
}
export declare class MappingEditorService {
    private readonly fileUploadManager;
    private _mappings$;
    /** Observable stream of current mapping edits */
    mappings$: import("rxjs").Observable<MappingEdits[]>;
    private _mappingsError$;
    /** Observable stream of mapping validation errors */
    mappingsError$: import("rxjs").Observable<MappingError | null>;
    private originalMappingJSON;
    private _mappingsEdited$;
    /** Observable stream indicating if mappings have been edited */
    mappingsEdited$: import("rxjs").Observable<boolean>;
    /**
     * Creates a new MappingEditorService instance.
     * @param fileUploadManager - The file upload manager to manage mappings for
     */
    constructor(fileUploadManager: FileUploadManager);
    private initializeMappings;
    /**
     * Applies all mapping changes to the file upload manager.
     * Updates mappings, renames pipeline fields, updates date processors, and removes convert processors.
     */
    applyChanges(): void;
    /**
     * Gets the current array of mapping edits.
     * @returns Array of mapping edit objects
     */
    getMappings(): MappingEdits[];
    /**
     * Gets the current mapping validation error, if any.
     * @returns Mapping error object or null if no errors
     */
    getMappingsError(): MappingError | null;
    /**
     * Checks if any mappings have been edited from their original state.
     * @returns True if mappings have been edited, false otherwise
     */
    getMappingsEdited(): boolean;
    /**
     * Updates a mapping at the specified index with new field name and/or type.
     * @param index - Index of the mapping to update
     * @param fieldName - New field name
     * @param fieldType - New field type or null
     */
    updateMapping(index: number, fieldName: string, fieldType: string | null): void;
    private checkMappingsValid;
    /**
     * Resets the mapping editor to its original state.
     * Clears all edits and restores original mappings.
     */
    reset(): void;
}
export {};

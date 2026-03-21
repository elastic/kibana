export interface UsageStats {
    'apiCalls.copySavedObjects.total'?: number;
    'apiCalls.copySavedObjects.kibanaRequest.yes'?: number;
    'apiCalls.copySavedObjects.kibanaRequest.no'?: number;
    'apiCalls.copySavedObjects.createNewCopiesEnabled.yes'?: number;
    'apiCalls.copySavedObjects.createNewCopiesEnabled.no'?: number;
    'apiCalls.copySavedObjects.overwriteEnabled.yes'?: number;
    'apiCalls.copySavedObjects.overwriteEnabled.no'?: number;
    'apiCalls.copySavedObjects.compatibilityModeEnabled.yes'?: number;
    'apiCalls.copySavedObjects.compatibilityModeEnabled.no'?: number;
    'apiCalls.resolveCopySavedObjectsErrors.total'?: number;
    'apiCalls.resolveCopySavedObjectsErrors.kibanaRequest.yes'?: number;
    'apiCalls.resolveCopySavedObjectsErrors.kibanaRequest.no'?: number;
    'apiCalls.resolveCopySavedObjectsErrors.createNewCopiesEnabled.yes'?: number;
    'apiCalls.resolveCopySavedObjectsErrors.createNewCopiesEnabled.no'?: number;
    'apiCalls.resolveCopySavedObjectsErrors.compatibilityModeEnabled.yes'?: number;
    'apiCalls.resolveCopySavedObjectsErrors.compatibilityModeEnabled.no'?: number;
    'apiCalls.disableLegacyUrlAliases.total'?: number;
}

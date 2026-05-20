import type { SavedObjectTypeRegistry } from '@kbn/core/server';
/**
 * This function returns any importable/exportable saved object types that are namespace-agnostic. Even if these are eligible for
 * import/export, we should not include them in the copy operation because it will result in a conflict that needs to overwrite itself to be
 * resolved.
 */
export declare function getIneligibleTypes(typeRegistry: Pick<SavedObjectTypeRegistry, 'getImportableAndExportableTypes' | 'isNamespaceAgnostic'>): string[];

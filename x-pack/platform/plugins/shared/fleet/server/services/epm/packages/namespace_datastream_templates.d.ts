import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { RegistryDataStream } from '../../../types';
/**
 * Returns true if namespace-level customization is opted in for `namespace` on
 * the installed `packageName`. Reads the Installation saved object's
 * `namespace_customization_enabled_for` list.
 */
export declare function isNamespaceCustomizationEnabledForPackage(soClient: SavedObjectsClientContract, packageName: string, namespace: string): Promise<boolean>;
/**
 * Inserts `<namespace>@custom` into a `composed_of` array at the correct position:
 *   - after the last package-level `@custom` (e.g. `system@custom`, no hyphen before `@custom`)
 *   - before the dataset-level `@custom` (e.g. `logs-system.application@custom`)
 *
 * If `<namespace>@custom` is already present, the array is returned unchanged.
 * This includes the case where a namespace name matches a package name (e.g.
 * namespace "nginx" for package "nginx") — the existing `nginx@custom` entry
 * already serves both the package-level and namespace-level roles, so no
 * duplicate is inserted.
 *
 * Used when building the `composed_of` for a namespace-scoped index template.
 */
export declare function insertNamespaceCustomTemplate(composedOf: string[], namespace: string, templateName: string): string[];
/**
 * After a package is (re)installed, rebuild the namespace-scoped index templates for
 * every namespace currently opted-in on the package (via
 * `Installation.namespace_customization_enabled_for`). Called from the state machine's
 * final step so namespace templates survive reinstalls and upgrades.
 *
 * On first install the opt-in list is empty, so this is a no-op.
 */
export declare function handleNamespaceTemplateRestoreAfterPackageInstall({ soClient, esClient, packageName, dataStreams, }: {
    soClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
    packageName: string;
    dataStreams: RegistryDataStream[];
}): Promise<void>;
export interface SyncNamespaceTemplatesSummary {
    packageName: string;
    created: string[];
    removed: string[];
    skipped: boolean;
}
/**
 * Creates or deletes namespace-scoped index templates for a single package, driven
 * by additions to and removals from `Installation.namespace_customization_enabled_for`.
 *
 * Called from the `fleet:sync_namespace_templates` task after the Installation SO's
 * opt-in list has been updated by the API handler.
 */
export declare function syncNamespaceTemplates({ soClient, esClient, packageName, addedNamespaces, removedNamespaces, abortController, }: {
    soClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
    packageName: string;
    addedNamespaces: string[];
    removedNamespaces: string[];
    abortController?: AbortController;
}): Promise<SyncNamespaceTemplatesSummary>;

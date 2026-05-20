import type { PluginManifestAuthor, UnmanagedPluginAssets } from '@kbn/agent-builder-common';
export interface PersistedPluginManifestMetadata {
    author?: PluginManifestAuthor;
    homepage?: string;
    repository?: string;
    license?: string;
    keywords?: string[];
}
export interface PluginCreateRequest {
    id?: string;
    name: string;
    version: string;
    description: string;
    manifest: PersistedPluginManifestMetadata;
    source_url?: string;
    skill_ids?: string[];
    unmanaged_assets: UnmanagedPluginAssets;
}
export interface PluginUpdateRequest {
    version?: string;
    description?: string;
    manifest?: PersistedPluginManifestMetadata;
    source_url?: string;
    skill_ids?: string[];
    unmanaged_assets?: UnmanagedPluginAssets;
}

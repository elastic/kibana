import type { ArchivePackage, RegistryPolicyTemplate, RegistryDataStream, RegistryInput, RegistryStream, RegistryVarsEntry, PackageSpecManifest } from '../../../../common/types';
export declare const MANIFEST_NAME = "manifest.yml";
export declare const DATASTREAM_MANIFEST_NAME = "manifest.yml";
export declare const DATASTREAM_ROUTING_RULES_NAME = "routing_rules.yml";
export declare const DATASTREAM_LIFECYCLE_NAME = "lifecycle.yml";
export declare const KIBANA_FOLDER_NAME = "kibana";
export declare const TAGS_NAME = "tags.yml";
export declare const expandDottedObject: (dottedObj?: object) => any[] | Record<string, any>;
export declare const expandDottedEntries: (obj: object) => any;
type AssetsBufferMap = Record<string, Buffer>;
/**
 * Filter assets needed for the parse and verify archive function
 */
export declare function filterAssetPathForParseAndVerifyArchive(assetPath: string): boolean;
export declare function generatePackageInfoFromArchiveBuffer(archiveBuffer: Buffer, contentType: string): Promise<{
    paths: string[];
    packageInfo: ArchivePackage;
}>;
export declare function _generatePackageInfoFromPaths(paths: string[], topLevelDir: string): Promise<ArchivePackage>;
export declare function parseAndVerifyArchive(paths: string[], assetsMap: AssetsBufferMap, topLevelDirOverride?: string): ArchivePackage;
export declare function parseAndVerifyReadme(paths: string[], pkgName: string, pkgVersion: string): string | null;
export declare function parseAndVerifyDataStreams(opts: {
    paths: string[];
    pkgName: string;
    pkgVersion: string;
    assetsMap: AssetsBufferMap;
    pkgBasePathOverride?: string;
}): RegistryDataStream[];
export declare function parseAndVerifyStreams(manifestStreams: any, dataStreamPath: string): RegistryStream[];
export declare function parseAndVerifyVars(manifestVars: any[], location: string): RegistryVarsEntry[];
export declare function parseAndVerifyPolicyTemplates(manifest: PackageSpecManifest): RegistryPolicyTemplate[];
export declare function parseAndVerifyInputs(manifestInputs: any, location: string): RegistryInput[];
export declare function parseDataStreamElasticsearchEntry(elasticsearch?: Record<string, any>, ingestPipeline?: string): Record<string, any>;
export declare function parseTopLevelElasticsearchEntry(elasticsearch?: Record<string, any>): Record<string, any>;
export declare function parseDefaultIngestPipeline(fullDataStreamPath: string, paths: string[]): "default" | undefined;
export {};

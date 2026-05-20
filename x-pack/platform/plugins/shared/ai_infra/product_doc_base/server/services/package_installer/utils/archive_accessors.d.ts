import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ArtifactManifest } from '@kbn/product-doc-common';
import type { ZipArchive } from './zip_archive';
export declare const loadManifestFile: (archive: ZipArchive) => Promise<ArtifactManifest>;
export declare const loadMappingFile: (archive: ZipArchive) => Promise<MappingTypeMapping>;

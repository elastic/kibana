import type { ContentPack, ContentPackEntry, ContentPackManifest } from '@kbn/content-packs-schema';
import type { Readable } from 'stream';
export declare function parseArchive(archive: Readable): Promise<ContentPack>;
export declare function generateArchive(manifest: ContentPackManifest, objects: ContentPackEntry[]): Promise<Buffer<ArrayBufferLike>>;

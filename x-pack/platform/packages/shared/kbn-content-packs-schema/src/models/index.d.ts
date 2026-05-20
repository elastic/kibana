import type { z } from '@kbn/zod/v4';
import type { ContentPackSavedObject } from './saved_object';
import type { ContentPackStream } from './stream';
export * from './api';
export * from './saved_object';
export * from './stream';
export declare const SUPPORTED_ENTRY_TYPE: Record<ContentPackEntry['type'], string>;
export type SupportedEntryType = keyof typeof SUPPORTED_ENTRY_TYPE;
export declare const isSupportedFile: (rootDir: string, filepath: string) => boolean;
export declare const getEntryTypeByFile: (rootDir: string, filepath: string) => SupportedEntryType;
export declare const isSupportedEntryType: (type: string) => boolean;
export interface ContentPackManifest {
    name: string;
    description: string;
    version: string;
}
export declare const contentPackManifestSchema: z.Schema<ContentPackManifest>;
export type ContentPackEntry = ContentPackSavedObject | ContentPackStream;
export interface ContentPack extends ContentPackManifest {
    entries: ContentPackEntry[];
}
export interface ContentPackPreviewEntry {
    type: string;
    id: string;
    title: string;
    errors: Array<{
        severity: 'fatal' | 'warning';
        message: string;
    }>;
}
export interface ContentPackPreview extends ContentPackManifest {
    entries: ContentPackPreviewEntry[];
}

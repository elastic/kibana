import type { ParsedPluginArchive } from '@kbn/agent-builder-common';
import type { ZipArchive } from '../archive';
/**
 * Parses and validates a Claude plugin zip archive.
 *
 * Extracts the manifest, parses skill files, and detects
 * unmanaged assets (commands, agents, hooks, etc.) that are
 * present in the archive but not yet supported for installation.
 */
export declare const parsePluginZipFile: (archive: ZipArchive) => Promise<ParsedPluginArchive>;
export declare class PluginArchiveError extends Error {
    constructor(message: string);
}

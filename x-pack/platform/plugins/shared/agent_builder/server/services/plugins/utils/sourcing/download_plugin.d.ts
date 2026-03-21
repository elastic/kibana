import { Transform } from 'stream';
import type { ParsedPluginArchive } from '@kbn/agent-builder-common';
import { type ResolvePluginUrlOptions } from './resolve_plugin_url';
export type ParsePluginFromUrlOptions = ResolvePluginUrlOptions;
/**
 * Downloads a plugin from a URL, parses its contents, and returns
 * the parsed plugin archive.
 *
 * Supported URL formats:
 * - `https://github.com/{owner}/{repo}/tree/{ref}/{path}` -- GitHub folder
 * - `https://github.com/{owner}/{repo}` -- GitHub repo root
 * - `https://github.com/{owner}/{repo}/blob/{ref}/{path}/plugin.json` -- GitHub blob to manifest
 * - `https://example.com/plugin.zip` -- direct zip download
 */
export declare const parsePluginFromUrl: (url: string, options?: ParsePluginFromUrlOptions) => Promise<ParsedPluginArchive>;
/**
 * Parses a plugin from a local zip file already on disk.
 */
export declare const parsePluginFromFile: (filePath: string) => Promise<ParsedPluginArchive>;
export declare const createSizeLimitTransform: (maxBytes: number, url: string) => Transform;

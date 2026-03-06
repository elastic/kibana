/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import type { ReadableStream as WebReadableStream } from 'stream/web';
import { pipeline } from 'stream/promises';
import { createWriteStream, deleteFile, getSafePath } from '@kbn/fs';
import type { ParsedPluginArchive } from '@kbn/agent-builder-common';
import { openZipArchive, type ZipArchive } from './open_zip_archive';
import { parsePluginZipFile, PluginArchiveError } from './parse_plugin_zip_file';
import { createScopedArchive, detectArchiveRootPrefix } from './create_scoped_archive';
import { resolvePluginUrl } from './resolve_plugin_url';

const VOLUME = 'agent_builder';

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
export const parsePluginFromUrl = async (url: string): Promise<ParsedPluginArchive> => {
  const resolved = resolvePluginUrl(url);

  const { archive, cleanup } = await downloadAndOpenArchive(resolved.downloadUrl);
  try {
    if (resolved.type === 'github') {
      const scopedArchive = scopeToPlugin(archive, resolved.pluginPath);
      return await parsePluginZipFile(scopedArchive);
    }
    return await parsePluginZipFile(archive);
  } finally {
    archive.close();
    await cleanup();
  }
};

const scopeToPlugin = (archive: ZipArchive, pluginPath?: string): ZipArchive => {
  const rootPrefix = detectArchiveRootPrefix(archive);
  const scopePrefix = pluginPath ? `${rootPrefix}${pluginPath}/` : rootPrefix;

  const scopedArchive = createScopedArchive(archive, scopePrefix);

  if (scopedArchive.getEntryPaths().length === 0) {
    throw new PluginArchiveError(
      `No files found at path "${pluginPath ?? '/'}" in the downloaded archive.`
    );
  }

  return scopedArchive;
};

const downloadAndOpenArchive = async (
  downloadUrl: string
): Promise<{ archive: ZipArchive; cleanup: () => Promise<void> }> => {
  const fileName = `tmp/${randomUUID()}.zip`;

  let fullPath: string;
  try {
    fullPath = await downloadToFile(downloadUrl, fileName);
  } catch (e) {
    await deleteFile(fileName, { volume: VOLUME }).catch(() => {});
    throw e;
  }

  let archive: ZipArchive;
  try {
    archive = await openZipArchive(fullPath);
  } catch (e) {
    await deleteFile(fileName, { volume: VOLUME }).catch(() => {});
    throw e;
  }

  const cleanup = async () => {
    await deleteFile(fileName, { volume: VOLUME }).catch(() => {});
  };

  return { archive, cleanup };
};

/**
 * Parses a plugin from a local zip file already on disk.
 */
export const parsePluginFromFile = async (filePath: string): Promise<ParsedPluginArchive> => {
  const archive = await openZipArchive(filePath);
  try {
    return await parsePluginZipFile(archive);
  } finally {
    archive.close();
  }
};

const downloadToFile = async (url: string, fileName: string): Promise<string> => {
  const res = await fetch(url, { redirect: 'follow' });

  if (!res.ok) {
    throw new PluginArchiveError(
      `Failed to download plugin archive from ${url}: ${res.status} ${res.statusText}`
    );
  }

  if (!res.body) {
    throw new PluginArchiveError(`Empty response body when downloading from ${url}`);
  }

  const { fullPath } = getSafePath(fileName, VOLUME);
  const readStream = Readable.fromWeb(res.body as WebReadableStream);
  const writeStream = createWriteStream(fileName, VOLUME);
  await pipeline(readStream, writeStream);

  return fullPath;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginManifest, ParsedSkillFile } from '@kbn/agent-builder-common';
import type { ZipArchive } from '../archive';
import { parseSkillFile } from './parse_skill_file';

const defaultCommandsDir = 'commands/';

/**
 * Reads command markdown files from the archive and converts them to ParsedSkillFile entries.
 * Each .md file under the commands directory becomes a skill, using the
 * filename (without extension) as the skill name.
 */
export const readCommands = async (
  archive: ZipArchive,
  manifest: PluginManifest
): Promise<ParsedSkillFile[]> => {
  const commandFiles = resolveCommandFiles(archive, manifest);
  const commands: ParsedSkillFile[] = [];

  for (const filePath of commandFiles) {
    const content = await archive.getEntryContent(filePath);
    const { meta, content: body } = parseSkillFile(content.toString('utf-8'));

    const fileName = filePath.split('/').pop()!;
    const dirName = fileName.replace(/\.md$/, '');

    commands.push({
      dirName,
      meta,
      content: body,
      referencedFiles: [],
    });
  }

  return commands;
};

/**
 * Resolves all command markdown files from the archive.
 * Looks under the default `commands/` directory and any custom paths
 * from the manifest.
 */
export const resolveCommandFiles = (archive: ZipArchive, manifest: PluginManifest): string[] => {
  const searchRoots = new Set<string>();
  searchRoots.add(defaultCommandsDir);

  if (manifest.commands !== undefined) {
    const customPaths = Array.isArray(manifest.commands) ? manifest.commands : [manifest.commands];
    for (const p of customPaths) {
      const cleaned = p.startsWith('./') ? p.substring(2) : p;
      if (cleaned.endsWith('.md')) {
        searchRoots.add(cleaned);
      } else {
        searchRoots.add(normalizeDirPath(p));
      }
    }
  }

  const commandFiles = new Set<string>();
  const entries = archive.getEntryPaths();

  for (const entryPath of entries) {
    if (entryPath.endsWith('/')) {
      continue;
    }
    for (const root of searchRoots) {
      if (root.endsWith('.md') && entryPath === root) {
        commandFiles.add(entryPath);
      } else if (entryPath.startsWith(root) && entryPath.endsWith('.md')) {
        commandFiles.add(entryPath);
      }
    }
  }

  return [...commandFiles];
};

const normalizeDirPath = (p: string): string => {
  const cleaned = p.startsWith('./') ? p.substring(2) : p;
  return cleaned.endsWith('/') ? cleaned : `${cleaned}/`;
};

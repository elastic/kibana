/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';

const METADATA_RELATIVE_PATH = 'x-pack/platform/packages/shared/kbn-evals/evals.suites.json';

const SKIP_DIRS = new Set([
  '.git',
  '.github',
  '.cache',
  '.fleet',
  'node_modules',
  'target',
  'build',
  'bazel-bin',
  'bazel-out',
  'bazel-testlogs',
  'bazel-kibana',
  'coverage',
  'data',
]);

export interface EvalSuiteMetadata {
  id: string;
  name?: string;
  description?: string;
  configPath: string;
  tags?: string[];
  ciLabels?: string[];
}

export interface EvalSuiteDefinition {
  id: string;
  name: string;
  configPath: string;
  absoluteConfigPath: string;
  suiteRoot: string | null;
  relativeSuiteRoot: string | null;
  tags: string[];
  ciLabels: string[];
  description?: string;
  source: 'metadata' | 'discovery';
}

interface MetadataFile {
  suites: EvalSuiteMetadata[];
}

const toPosixPath = (value: string) => value.split(Path.sep).join('/');

export const readSuiteMetadata = (repoRoot: string, log?: ToolingLog): EvalSuiteMetadata[] => {
  const filePath = Path.join(repoRoot, METADATA_RELATIVE_PATH);
  if (!Fs.existsSync(filePath)) {
    return [];
  }

  try {
    const raw = Fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as MetadataFile;
    return Array.isArray(parsed.suites) ? parsed.suites : [];
  } catch (error) {
    log?.warning(`Failed to read eval suite metadata at ${filePath}`);
    return [];
  }
};

const shouldSkipDir = (dirName: string) => SKIP_DIRS.has(dirName);

const isPlaywrightConfig = (fileName: string) => fileName.endsWith('playwright.config.ts');

const looksLikeEvalConfig = (content: string) =>
  content.includes('createPlaywrightEvalsConfig') && content.includes('@kbn/evals');

const walkForEvalConfigs = (rootDir: string, configs: string[], log?: ToolingLog) => {
  const entries = Fs.readdirSync(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) {
        continue;
      }
      walkForEvalConfigs(Path.join(rootDir, entry.name), configs, log);
      continue;
    }

    if (!entry.isFile() || !isPlaywrightConfig(entry.name)) {
      continue;
    }

    const filePath = Path.join(rootDir, entry.name);
    try {
      const content = Fs.readFileSync(filePath, 'utf-8');
      if (looksLikeEvalConfig(content)) {
        configs.push(filePath);
      }
    } catch (error) {
      log?.warning(`Failed to read ${filePath}`);
    }
  }
};

const deriveSuiteId = (
  configPath: string,
  repoRoot: string
): { id: string; suiteRoot: string | null } => {
  const relPath = toPosixPath(Path.relative(repoRoot, configPath));
  const parts = relPath.split('/');
  const suiteIndex = parts.findIndex((part) => part.startsWith('kbn-evals-suite-'));

  if (suiteIndex === -1) {
    const fallback = relPath.replace(/\//g, '_').replace(/\.ts$/, '');
    return { id: fallback, suiteRoot: null };
  }

  const suiteDir = parts[suiteIndex];
  const suiteRoot = parts.slice(0, suiteIndex + 1).join('/');
  const baseId = suiteDir.replace('kbn-evals-suite-', '');

  const relativeDir = parts.slice(suiteIndex + 1, -1).join('/');
  const suffix = relativeDir ? `/${relativeDir}` : '';
  return { id: `${baseId}${suffix}`, suiteRoot };
};

const normalizeSuite = (
  metadata: EvalSuiteMetadata | undefined,
  configPath: string,
  repoRoot: string
): EvalSuiteDefinition => {
  const derived = deriveSuiteId(configPath, repoRoot);
  const id = metadata?.id ?? derived.id;
  const name = metadata?.name ?? id;
  const tags = metadata?.tags ?? [];
  const ciLabels = metadata?.ciLabels ?? [`evals:${id}`];
  const relConfigPath = toPosixPath(Path.relative(repoRoot, configPath));

  return {
    id,
    name,
    configPath: relConfigPath,
    absoluteConfigPath: configPath,
    suiteRoot: derived.suiteRoot,
    relativeSuiteRoot: derived.suiteRoot,
    tags,
    ciLabels,
    description: metadata?.description,
    source: metadata ? 'metadata' : 'discovery',
  };
};

export const discoverEvalSuites = (repoRoot: string, log?: ToolingLog): EvalSuiteDefinition[] => {
  const searchRoots = [Path.join(repoRoot, 'x-pack'), Path.join(repoRoot, 'src/platform')];
  const discoveredConfigs: string[] = [];
  const metadata = readSuiteMetadata(repoRoot, log);

  for (const root of searchRoots) {
    if (!Fs.existsSync(root)) {
      continue;
    }
    walkForEvalConfigs(root, discoveredConfigs, log);
  }

  const metadataByConfig = new Map(metadata.map((entry) => [toPosixPath(entry.configPath), entry]));

  const suites = discoveredConfigs.map((configPath) => {
    const relConfigPath = toPosixPath(Path.relative(repoRoot, configPath));
    const entry = metadataByConfig.get(relConfigPath);
    return normalizeSuite(entry, configPath, repoRoot);
  });

  const discoveredConfigSet = new Set(suites.map((suite) => suite.configPath));
  const orphanedMetadata = metadata.filter(
    (entry) => !discoveredConfigSet.has(toPosixPath(entry.configPath))
  );

  if (orphanedMetadata.length > 0) {
    log?.warning(
      `Found ${orphanedMetadata.length} eval suite metadata entries without matching configs`
    );
  }

  return suites.sort((a, b) => a.id.localeCompare(b.id));
};

export const resolveEvalSuites = (
  repoRoot: string,
  log?: ToolingLog,
  options?: { refresh?: boolean }
): EvalSuiteDefinition[] => {
  const metadata = readSuiteMetadata(repoRoot, log);
  const hasMetadata = metadata.length > 0;
  const shouldScan = options?.refresh || !hasMetadata;

  if (!shouldScan) {
    return metadata
      .map((entry) => {
        const absoluteConfigPath = Path.resolve(repoRoot, entry.configPath);
        return normalizeSuite(entry, absoluteConfigPath, repoRoot);
      })
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  return discoverEvalSuites(repoRoot, log);
};

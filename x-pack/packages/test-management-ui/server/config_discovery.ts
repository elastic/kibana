/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import type { TestConfig, DiscoveredConfigs } from '../types';

function generateId(filePath: string): string {
  return crypto.createHash('md5').update(filePath).digest('hex').slice(0, 12);
}

const VISIBILITY_GROUPS = new Set(['shared', 'private']);

function skipVisibility(parts: string[], idx: number): string {
  const next = parts[idx];
  if (VISIBILITY_GROUPS.has(next) && parts.length > idx + 1) {
    return parts[idx + 1];
  }
  return next;
}

function getOwnerPackage(relativePath: string): string {
  const parts = relativePath.split('/');
  const pluginIdx = parts.indexOf('plugins');
  if (pluginIdx !== -1 && parts.length > pluginIdx + 1) {
    return skipVisibility(parts, pluginIdx + 1);
  }
  const packagesIdx = parts.indexOf('packages');
  if (packagesIdx !== -1 && parts.length > packagesIdx + 1) {
    return skipVisibility(parts, packagesIdx + 1);
  }
  return parts.slice(0, 3).join('/');
}

function humanize(slug: string): string {
  const KNOWN: Record<string, string> = {
    slo: 'SLO',
    apm: 'APM',
    ml: 'ML',
    ftr: 'FTR',
    eui: 'EUI',
    api: 'API',
    ui: 'UI',
    ux: 'UX',
    siem: 'SIEM',
    osquery: 'Osquery',
    uptime: 'Uptime',
    infra: 'Infrastructure',
  };
  if (KNOWN[slug.toLowerCase()]) return KNOWN[slug.toLowerCase()];
  return slug
    .replace(/^kbn-/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildConfigName(type: string, ownerPackage: string, relativePath: string): string {
  const label = humanize(ownerPackage);
  const parts = relativePath.split('/');
  const isPlugin = parts.includes('plugins');
  const moduleKind = isPlugin ? 'Plugin' : 'Package';
  return `${label} ${moduleKind} ${type}`;
}

const ownerCache = new Map<string, string[] | undefined>();

function parseJsonc(raw: string): unknown {
  const stripped = raw
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(stripped);
}

function normalizeOwner(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.flatMap((v: unknown) =>
      typeof v === 'string' ? v.split(/\s+/).filter(Boolean) : []
    );
  }
  if (typeof value === 'string' && value.length > 0) {
    return value.split(/\s+/).filter(Boolean);
  }
  return undefined;
}

function findOwner(directory: string, repoRoot: string): string[] | undefined {
  const resolved = path.resolve(directory);
  if (ownerCache.has(resolved)) {
    return ownerCache.get(resolved);
  }

  let current = resolved;
  const root = path.resolve(repoRoot);

  while (current.startsWith(root)) {
    const jsonc = path.join(current, 'kibana.jsonc');
    if (fs.existsSync(jsonc)) {
      try {
        const parsed = parseJsonc(fs.readFileSync(jsonc, 'utf-8')) as {
          owner?: string | string[];
        };
        const owner = normalizeOwner(parsed.owner);
        if (owner && owner.length > 0) {
          ownerCache.set(resolved, owner);
          return owner;
        }
      } catch {
        // malformed jsonc — try parent directory
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  ownerCache.set(resolved, undefined);
  return undefined;
}

function gitListFiles(repoRoot: string, pattern: string): string[] {
  try {
    const result = execSync(`git ls-files --cached --others --exclude-standard "${pattern}"`, {
      cwd: repoRoot,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
    });
    return result
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
}

function discoverJestConfigs(repoRoot: string): TestConfig[] {
  const files = gitListFiles(repoRoot, '**/jest.config.js');
  return files.map((relativePath) => {
    const configPath = path.resolve(repoRoot, relativePath);
    const directory = path.dirname(configPath);
    return {
      id: generateId(relativePath),
      type: 'jest' as const,
      name: buildConfigName('Jest', getOwnerPackage(relativePath), relativePath),
      configPath,
      relativePath,
      directory,
      jestType: 'unit' as const,
      ownerPackage: getOwnerPackage(relativePath),
      owner: findOwner(directory, repoRoot),
    };
  });
}

function discoverJestIntegrationConfigs(repoRoot: string): TestConfig[] {
  const files = gitListFiles(repoRoot, '**/jest.integration.config.js');
  return files.map((relativePath) => {
    const configPath = path.resolve(repoRoot, relativePath);
    const directory = path.dirname(configPath);
    return {
      id: generateId(relativePath),
      type: 'jest-integration' as const,
      name: buildConfigName('Jest Integration', getOwnerPackage(relativePath), relativePath),
      configPath,
      relativePath,
      directory,
      jestType: 'integration' as const,
      ownerPackage: getOwnerPackage(relativePath),
      owner: findOwner(directory, repoRoot),
    };
  });
}

function discoverScoutConfigs(repoRoot: string): TestConfig[] {
  const files = gitListFiles(repoRoot, '**/test/scout/**/playwright.config.ts');
  // Also look for parallel configs
  const parallelFiles = gitListFiles(repoRoot, '**/test/scout*/**/parallel.playwright.config.ts');
  const allFiles = [...new Set([...files, ...parallelFiles])];

  return allFiles.map((relativePath) => {
    const configPath = path.resolve(repoRoot, relativePath);
    const directory = path.dirname(configPath);
    const isParallel = relativePath.includes('parallel.');
    const isApi = relativePath.includes('/api/');
    const testKind = isApi ? 'API' : 'UI';

    return {
      id: generateId(relativePath),
      type: 'scout' as const,
      name: buildConfigName(
        `Scout ${testKind}${isParallel ? ' Parallel' : ''}`,
        getOwnerPackage(relativePath),
        relativePath
      ),
      configPath,
      relativePath,
      directory,
      testDir: './tests',
      ownerPackage: getOwnerPackage(relativePath),
      owner: findOwner(directory, repoRoot),
    };
  });
}

function discoverFtrConfigs(repoRoot: string): TestConfig[] {
  // FTR configs are typically config.ts files inside test/ directories
  // that import from @kbn/test and use FtrConfigProviderContext
  const patterns = [
    '**/test/functional/**/config.ts',
    '**/test/functional_*/config.ts',
    '**/test/functional_*/**/config.ts',
    '**/test/api_integration/**/config.ts',
    '**/test/api_integration_*/**/config.ts',
    '**/test/*_api_integration/**/config.ts',
    '**/test/ftr_apis/**/config.ts',
  ];

  const allFiles = new Set<string>();
  for (const pattern of patterns) {
    const files = gitListFiles(repoRoot, pattern);
    files.forEach((f) => allFiles.add(f));
  }

  // Filter to only include files that are likely FTR configs (not scout configs)
  const ftrFiles = [...allFiles].filter(
    (f) => !f.includes('/scout/') && !f.includes('node_modules')
  );

  return ftrFiles.map((relativePath) => {
    const configPath = path.resolve(repoRoot, relativePath);
    const directory = path.dirname(configPath);

    return {
      id: generateId(relativePath),
      type: 'ftr' as const,
      name: buildConfigName('FTR', getOwnerPackage(relativePath), relativePath),
      configPath,
      relativePath,
      directory,
      ownerPackage: getOwnerPackage(relativePath),
      owner: findOwner(directory, repoRoot),
    };
  });
}

interface TestFileCountMaps {
  unit: Map<string, number>;
  integration: Map<string, number>;
  all: Map<string, number>;
}

/**
 * Build maps from relative directory path to the number of test files it
 * contains, separated into unit vs integration. The integration preset
 * matches `*​/integration_tests/​*.test.*`; everything else is unit.
 */
function buildTestFileCountMaps(repoRoot: string): TestFileCountMaps {
  const patterns = [
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.test.js',
    '**/*.test.jsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
  ];

  const allTestFiles: string[] = [];
  for (const pattern of patterns) {
    allTestFiles.push(...gitListFiles(repoRoot, pattern));
  }

  const INTEGRATION_RE = /\/integration_tests\//;
  const unit = new Map<string, number>();
  const integration = new Map<string, number>();
  const all = new Map<string, number>();

  for (const file of allTestFiles) {
    const isIntegration = INTEGRATION_RE.test(file);
    const target = isIntegration ? integration : unit;
    let dir = path.dirname(file);
    while (dir && dir !== '.') {
      target.set(dir, (target.get(dir) ?? 0) + 1);
      all.set(dir, (all.get(dir) ?? 0) + 1);
      dir = path.dirname(dir);
    }
  }

  return { unit, integration, all };
}

function assignTestCounts(configs: TestConfig[], countMap: Map<string, number>): void {
  for (const config of configs) {
    const relDir = path.dirname(config.relativePath);
    config.testCount = countMap.get(relDir) ?? 0;
  }
}

export {
  discoverJestConfigs,
  discoverJestIntegrationConfigs,
  discoverScoutConfigs,
  discoverFtrConfigs,
  buildTestFileCountMaps,
  assignTestCounts,
};

export function discoverAllConfigs(repoRoot: string): DiscoveredConfigs {
  const jest = discoverJestConfigs(repoRoot);
  const jestIntegration = discoverJestIntegrationConfigs(repoRoot);
  const scout = discoverScoutConfigs(repoRoot);
  const ftr = discoverFtrConfigs(repoRoot);

  const maps = buildTestFileCountMaps(repoRoot);
  assignTestCounts(jest, maps.unit);
  assignTestCounts(jestIntegration, maps.integration);
  assignTestCounts(scout, maps.all);
  assignTestCounts(ftr, maps.all);

  return {
    jest,
    jestIntegration,
    scout,
    ftr,
    totalCount: jest.length + jestIntegration.length + scout.length + ftr.length,
    discoveredAt: new Date().toISOString(),
    discoveryStatus: 'complete',
  };
}

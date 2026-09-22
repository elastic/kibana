/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { parse as parseYaml } from 'yaml';

export const parseGsPath = (gcsPath: string): { bucket: string; path: string } => {
  if (!gcsPath.startsWith('gs://')) {
    throw new Error(`Invalid gcs_path (expected gs://...): ${gcsPath}`);
  }
  const remainder = gcsPath.slice('gs://'.length);
  const idx = remainder.indexOf('/');
  if (idx === -1) {
    return { bucket: remainder, path: '' };
  }
  return { bucket: remainder.slice(0, idx), path: remainder.slice(idx + 1) };
};

export const titleCase = (s: string): string =>
  s
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');

export const buildEntrySourceDisplayName = (gcsPath: string): string => {
  const { path } = parseGsPath(gcsPath);
  const parts = path.split('/').filter(Boolean);
  if (parts.length >= 3) {
    const [domain, ...rest] = parts;
    const runId = rest.at(-1) as string;
    const scenario = rest.slice(0, -1).join(' / ');
    return `${titleCase(domain)}: ${scenario} (${runId})`;
  }
  return `ES snapshot dataset: ${gcsPath}`;
};

export const buildFullyQualifiedName = (gcsPath: string): string => {
  const { bucket, path } = parseGsPath(gcsPath);
  const segments = path ? path.split('/').filter(Boolean) : [];
  return `custom:es-snapshots.${[bucket, ...segments].join('.')}`;
};

export const formatShellCommand = (args: string[]): string =>
  args
    .map((a) => {
      if (/^[A-Za-z0-9_./:=,@-]+$/.test(a)) return a;
      return `'${a.replaceAll("'", `'\"'\"'`)}'`;
    })
    .join(' ');

export interface SnapshotAspectData {
  gcs_path: string;
  description?: string;
  team?: string;
}

export const readAspectData = (filePath: string): SnapshotAspectData => {
  const raw = Fs.readFileSync(filePath, 'utf8');
  const parsed = parseYaml(raw) as unknown;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Invalid YAML (expected object) in ${filePath}`);
  }

  const topKeys = Object.keys(parsed as Record<string, unknown>);
  if (topKeys.length === 0) throw new Error(`No aspect keys found in ${filePath}`);

  const firstKey = topKeys[0];
  const aspect = (parsed as Record<string, any>)[firstKey];
  const data = aspect?.data;
  if (!data || typeof data !== 'object') {
    throw new Error(`Missing aspect data in ${filePath}`);
  }
  const gcsPath = data.gcs_path;
  if (typeof gcsPath !== 'string' || gcsPath.trim().length === 0) {
    throw new Error(`Missing data.gcs_path in ${filePath}`);
  }
  return {
    gcs_path: gcsPath,
    description: typeof data.description === 'string' ? data.description : undefined,
    team: typeof data.team === 'string' ? data.team : undefined,
  };
};

export const listYamlFilesRecursively = (dir: string): string[] => {
  const out: string[] = [];
  const entries = Fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = Path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...listYamlFilesRecursively(full));
      continue;
    }
    if (ent.isFile() && (ent.name.endsWith('.yaml') || ent.name.endsWith('.yml'))) {
      out.push(full);
    }
  }
  return out;
};

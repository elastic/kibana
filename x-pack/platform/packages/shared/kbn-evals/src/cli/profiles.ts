/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';

export const VAULT_CONFIG_DIR = 'x-pack/platform/packages/shared/kbn-evals/scripts/vault';

interface VaultConfig {
  evaluationsKbn?: { url?: string; apiKey?: string };
  evaluationsEs?: { url?: string; apiKey?: string };
  tracingEs?: { url?: string; apiKey?: string };
  tracingExporters?: unknown;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isPlaceholder = (value: string): boolean => value.includes('REPLACE_ME');

export const resolveVaultConfigPath = (repoRoot: string, profile?: string): string => {
  const normalized = profile && profile.trim().length > 0 ? profile.trim() : undefined;
  const isDefault = normalized === undefined || normalized === 'config' || normalized === 'default';
  const fileName = isDefault ? 'config.json' : `config.${normalized}.json`;
  return Path.resolve(repoRoot, VAULT_CONFIG_DIR, fileName);
};

export const defaultExportProfile = (repoRoot: string): string | undefined => {
  const candidate = resolveVaultConfigPath(repoRoot, 'local');
  return Fs.existsSync(candidate) ? 'local' : undefined;
};

export const readVaultConfig = (repoRoot: string, profile?: string): VaultConfig | undefined => {
  const filePath = resolveVaultConfigPath(repoRoot, profile);
  if (!Fs.existsSync(filePath)) return undefined;
  const raw = Fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as VaultConfig;
};

export const envFromDatasetsProfile = (
  repoRoot: string,
  profile?: string
): Record<string, string> => {
  const cfg = readVaultConfig(repoRoot, profile);
  if (!cfg?.evaluationsKbn) return {};

  const next: Record<string, string> = {};
  if (isNonEmptyString(cfg.evaluationsKbn.url) && !isPlaceholder(cfg.evaluationsKbn.url)) {
    next.EVALUATIONS_KBN_URL = cfg.evaluationsKbn.url;
  }
  if (isNonEmptyString(cfg.evaluationsKbn.apiKey) && !isPlaceholder(cfg.evaluationsKbn.apiKey)) {
    next.EVALUATIONS_KBN_API_KEY = cfg.evaluationsKbn.apiKey;
  }
  return next;
};

export const envFromExportProfile = (
  repoRoot: string,
  profile?: string,
  options?: { defaultTracingExporters?: boolean }
): Record<string, string> => {
  // Critical safety/ergonomics: don't implicitly use config.json as an export profile.
  // Export profile must be explicitly selected (e.g. `local`, `ci`, `config`).
  if (!profile) return {};

  const cfg = readVaultConfig(repoRoot, profile);
  if (!cfg) return {};

  const next: Record<string, string> = {};

  if (isNonEmptyString(cfg.evaluationsEs?.url) && !isPlaceholder(cfg.evaluationsEs.url)) {
    next.EVALUATIONS_ES_URL = cfg.evaluationsEs.url;
  }
  if (isNonEmptyString(cfg.evaluationsEs?.apiKey) && !isPlaceholder(cfg.evaluationsEs.apiKey)) {
    next.EVALUATIONS_ES_API_KEY = cfg.evaluationsEs.apiKey;
  }

  if (isNonEmptyString(cfg.tracingEs?.url) && !isPlaceholder(cfg.tracingEs.url)) {
    next.TRACING_ES_URL = cfg.tracingEs.url;
  }
  if (isNonEmptyString(cfg.tracingEs?.apiKey) && !isPlaceholder(cfg.tracingEs.apiKey)) {
    next.TRACING_ES_API_KEY = cfg.tracingEs.apiKey;
  }

  if (Array.isArray(cfg.tracingExporters) && cfg.tracingExporters.length > 0) {
    next.TRACING_EXPORTERS = JSON.stringify(cfg.tracingExporters);
  } else if (options?.defaultTracingExporters) {
    next.TRACING_EXPORTERS = JSON.stringify([{ http: { url: 'http://localhost:4318/v1/traces' } }]);
  }

  return next;
};

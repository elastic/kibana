/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * File cache for a developer's personal nightshift-investigations sandbox credential.
 *
 * The shared eval sandbox (dev-vault, ci-prod) authenticates via sandbox-api's certless
 * "local-dev credential auth" (elastic/sandbox-service, docs/mtls.md#local-dev-credential-auth-optional):
 * a `<username>:<password>` pair generated per developer. That pair must not live in the team's
 * shared Vault config, so it is cached locally instead, at ~/.elastic/nightshift-sandbox-credential.json
 * (mirroring the EIS connector cache), and reused across `evals start` invocations until the
 * developer rotates it.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

interface CachedSandboxCredential {
  value: string;
  cached_at_ms: number;
}

const CACHE_DIR = path.join(os.homedir(), '.elastic');
const CACHE_PATH = path.join(CACHE_DIR, 'nightshift-sandbox-credential.json');

export const readCachedSandboxCredential = (): string | undefined => {
  try {
    if (!fs.existsSync(CACHE_PATH)) {
      return undefined;
    }
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
    const cached: CachedSandboxCredential = JSON.parse(raw);
    return cached.value || undefined;
  } catch {
    return undefined;
  }
};

export const writeCachedSandboxCredential = (value: string): void => {
  const entry: CachedSandboxCredential = { value, cached_at_ms: Date.now() };

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  fs.writeFileSync(CACHE_PATH, JSON.stringify(entry, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });
};

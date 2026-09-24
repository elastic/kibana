/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFlagError } from '@kbn/dev-cli-errors';

export const SCOUT_ARCHES = ['stateful', 'serverless'] as const;
export type ScoutArch = (typeof SCOUT_ARCHES)[number];

/** The `--arch` / `--domain` pair Scout starts the eval stack with. */
export interface ScoutTarget {
  arch: ScoutArch;
  domain: string;
}

export const DEFAULT_SCOUT_TARGET: ScoutTarget = { arch: 'stateful', domain: 'classic' };

const isScoutArch = (value: string): value is ScoutArch =>
  (SCOUT_ARCHES as readonly string[]).includes(value);

/**
 * Resolves the Scout arch/domain from `--scout-arch` / `--scout-domain`, falling back to the
 * suite's `scoutArch` / `scoutDomain` and then stateful/classic. The suite's domain only applies
 * while its arch is used; Scout itself rejects a domain the config set has no file for.
 */
export const resolveScoutTarget = (
  suite: { scoutArch?: string; scoutDomain?: string } | undefined,
  flags: { arch?: string; domain?: string } = {}
): ScoutTarget => {
  const arch = flags.arch ?? suite?.scoutArch ?? DEFAULT_SCOUT_TARGET.arch;
  if (!isScoutArch(arch)) {
    throw createFlagError(`Invalid Scout arch "${arch}" (expected ${SCOUT_ARCHES.join(' or ')})`);
  }

  const suiteDomain =
    arch === (suite?.scoutArch ?? DEFAULT_SCOUT_TARGET.arch) ? suite?.scoutDomain : undefined;
  const domain =
    flags.domain ?? suiteDomain ?? (arch === 'stateful' ? DEFAULT_SCOUT_TARGET.domain : undefined);
  if (!domain) {
    throw createFlagError(
      'Serverless needs a Scout domain: pass --scout-domain (e.g. observability_complete)'
    );
  }

  return { arch, domain };
};

export const formatScoutTarget = ({ arch, domain }: ScoutTarget): string => `${arch}/${domain}`;

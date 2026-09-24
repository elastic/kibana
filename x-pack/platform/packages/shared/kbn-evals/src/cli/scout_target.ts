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

/** Env var equivalent of `--scout-arch`, for runs that cannot pass CLI flags. */
export const SCOUT_ARCH_OVERRIDE_ENV = 'EVALS_SCOUT_ARCH';

const isScoutArch = (value: string): value is ScoutArch =>
  (SCOUT_ARCHES as readonly string[]).includes(value);

/**
 * Resolves the Scout arch/domain for a suite. `override` (`--scout-arch` or `EVALS_SCOUT_ARCH`)
 * replaces the suite's arch; switching to stateful uses the `classic` domain, and switching to
 * serverless requires the suite to declare its serverless domain.
 */
export const resolveScoutTarget = (
  suite: { id?: string; scoutArch?: string; scoutDomain?: string } | undefined,
  override?: string
): ScoutTarget => {
  const suiteArch = suite?.scoutArch ?? DEFAULT_SCOUT_TARGET.arch;
  if (!isScoutArch(suiteArch)) {
    throw new Error(
      `Suite "${suite?.id}" has an invalid scoutArch "${suiteArch}" (expected ${SCOUT_ARCHES.join(
        ' or '
      )})`
    );
  }
  if (suiteArch === 'serverless' && !suite?.scoutDomain) {
    throw new Error(`Suite "${suite?.id}" sets scoutArch "serverless" without a scoutDomain`);
  }
  const suiteTarget: ScoutTarget = {
    arch: suiteArch,
    domain: suite?.scoutDomain ?? DEFAULT_SCOUT_TARGET.domain,
  };

  if (!override || override === suiteTarget.arch) {
    return suiteTarget;
  }
  if (!isScoutArch(override)) {
    throw createFlagError(
      `Invalid Scout arch "${override}" (expected ${SCOUT_ARCHES.join(' or ')})`
    );
  }
  if (override === 'stateful') {
    return DEFAULT_SCOUT_TARGET;
  }
  throw createFlagError(
    `Suite "${suite?.id ?? 'custom config'}" has no serverless scoutDomain in evals.suites.json`
  );
};

export const formatScoutTarget = ({ arch, domain }: ScoutTarget): string => `${arch}/${domain}`;

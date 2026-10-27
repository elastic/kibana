/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { FALLBACK_OSQUERY_VERSION } from '../../../common/constants';

// Last minor of each major older than the live major. Must be updated when a
// new major ships (add the previous major's last minor) or when another minor
// ships for an older major (e.g. a 5.24 after 6.0). A missing major lists only
// `<major>.0.0`.
const LAST_KNOWN_MINOR: Record<number, number> = { 5: 23 };

// Oldest major the picker lists. Anything below it can't be a live osquery
// version (e.g. the integration version `1.35.0` when package metadata is missing).
const MIN_MAJOR = 5;

const LIVE_VERSION_RE = /^(\d+)\.(\d+)\.(\d+)$/;

const parseLiveVersion = (version: string): { major: number; minor: number } | undefined => {
  const match = LIVE_VERSION_RE.exec(version);
  if (!match) return undefined;

  const major = parseInt(match[1], 10);
  if (major < MIN_MAJOR) return undefined;

  return { major, minor: parseInt(match[2], 10) };
};

/** True when `version` looks like a real osquery release (`<major>.<minor>.<patch>`, major >= 5). */
export const isLiveOsqueryVersion = (version: string): boolean => !!parseLiveVersion(version);

export const getOsqueryVersionOptions = (
  liveVersion: string
): Array<EuiComboBoxOptionOption<string>> => {
  const parsed = parseLiveVersion(liveVersion);
  const effectiveLive = parsed ? liveVersion : FALLBACK_OSQUERY_VERSION;
  // FALLBACK_OSQUERY_VERSION is a valid live version, so this always resolves.
  const { major: liveMajor, minor: liveMinor } = parsed ??
    parseLiveVersion(FALLBACK_OSQUERY_VERSION) ?? { major: MIN_MAJOR, minor: 0 };

  const labels: string[] = [effectiveLive];

  for (let m = liveMinor; m >= 0; m--) {
    labels.push(`${liveMajor}.${m}.0`);
  }

  // Older majors down to MIN_MAJOR
  for (let major = liveMajor - 1; major >= MIN_MAJOR; major--) {
    const lastMinor = LAST_KNOWN_MINOR[major] ?? 0;
    for (let m = lastMinor; m >= 0; m--) {
      labels.push(`${major}.${m}.0`);
    }
  }

  // Dedupe preserving order
  const seen = new Set<string>();
  const unique = labels.filter((l) => {
    if (seen.has(l)) return false;
    seen.add(l);

    return true;
  });

  return unique.map((label) => ({ label }));
};

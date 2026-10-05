/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { FALLBACK_OSQUERY_VERSION } from '../../../common/constants';

// Last known minor for each major older than the live major.
// This is frozen history — only extended when a new major ships.
const LAST_KNOWN_MINOR: Record<number, number> = { 5: 23 };

const LIVE_VERSION_RE = /^(\d+)\.(\d+)\.(\d+)$/;

export const getOsqueryVersionOptions = (
  liveVersion: string
): Array<EuiComboBoxOptionOption<string>> => {
  const effectiveLive = LIVE_VERSION_RE.test(liveVersion) ? liveVersion : FALLBACK_OSQUERY_VERSION;
  const [, majorStr, minorStr] = LIVE_VERSION_RE.exec(effectiveLive)!;
  const liveMajor = parseInt(majorStr, 10);
  const liveMinor = parseInt(minorStr, 10);

  const labels: string[] = [effectiveLive];

  for (let m = liveMinor; m >= 0; m--) {
    labels.push(`${liveMajor}.${m}.0`);
  }

  // Older majors down to 5
  for (let major = liveMajor - 1; major >= 5; major--) {
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

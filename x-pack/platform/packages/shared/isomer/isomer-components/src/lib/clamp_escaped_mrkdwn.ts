/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clampSlackText, escapeMrkdwn } from '@elastic/isomer-sdk/slack';

/**
 * `raw` escaped for `mrkdwn` and at most `max` characters, cut before escaping so no entity is split.
 * Escaping can grow each character fivefold (`&` to `&amp;`), so this searches for the longest raw cut that fits.
 */
export const clampEscapedMrkdwn = (raw: string, max: number): string => {
  const escaped = escapeMrkdwn(raw);
  if (escaped.length <= max) {
    return escaped;
  }

  let fits = escapeMrkdwn(clampSlackText(raw, 1));
  let low = 1;
  let high = Math.min(max, raw.length);
  while (low < high) {
    const budget = Math.ceil((low + high) / 2);
    const candidate = escapeMrkdwn(clampSlackText(raw, budget));
    if (candidate.length <= max) {
      fits = candidate;
      low = budget;
    } else {
      high = budget - 1;
    }
  }
  return fits;
};

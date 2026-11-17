/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Validated with `Intl`'s own time zone database instead of `moment-timezone`, which bundles its
 * own multi-hundred-KB copy of the IANA time zone database just for this one check.
 */
export const validateTimezone = (timezone?: string) => {
  if (!timezone) {
    return;
  }
  try {
    // eslint-disable-next-line no-new
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
  } catch {
    return `Invalid schedule timezone: ${timezone}`;
  }
  return;
};

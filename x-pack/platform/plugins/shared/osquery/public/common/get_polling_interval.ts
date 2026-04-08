/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns a polling interval in ms that increases over time to avoid
 * hammering Kibana/ES when an action has long-lived pending agents.
 *
 * Schedule:
 *  - First 2 minutes:  5 s   (responsive while online agents respond)
 *  - 2–10 minutes:     15 s
 *  - 10–60 minutes:    60 s
 *  - After 1 hour:     5 min
 */
export const getPollingInterval = (startDate: string | undefined): number => {
  if (!startDate) return 5000;

  const elapsedMs = Date.now() - new Date(startDate).getTime();
  const elapsedMinutes = elapsedMs / 60_000;

  if (elapsedMinutes < 2) return 5_000;
  if (elapsedMinutes < 10) return 15_000;
  if (elapsedMinutes < 60) return 60_000;

  return 300_000; // 5 minutes
};

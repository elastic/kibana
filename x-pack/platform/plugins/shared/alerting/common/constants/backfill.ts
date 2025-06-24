/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_SCHEDULE_BACKFILL_BULK_SIZE = 100;
// Only allow scheduling backfills up to 90 days in the past
export const MAX_SCHEDULE_BACKFILL_LOOKBACK_WINDOW_DAYS = 90;
export const MAX_SCHEDULE_BACKFILL_LOOKBACK_WINDOW_MS =
  MAX_SCHEDULE_BACKFILL_LOOKBACK_WINDOW_DAYS * 24 * 60 * 60 * 1000;

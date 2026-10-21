/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoostDataAge } from '../../common/types';

// The sample indices and data streams hold only a few KB, so cost estimates would round to nothing.
// These illustrative sizes make the estimates read like a real project's.
export const SAMPLE_DATA_SIZES_GB: Readonly<Record<string, number>> = {
  products: 12,
  'catalog-2026-spring': 4,
  'catalog-2026-fall': 4,
  'archive-2024': 80,
  'archive-2025': 60,
  synonyms: 0.05,
  users: 2,
  'logs-checkout-default': 150,
  'logs-search-default': 90,
  'metrics-hosts-default': 40,
  'clicks-web': 200,
  'clicks-mobile': 120,
  'events-app': 30,
};

// Their documents are counted at an illustrative average size, so the counts match the sizes.
const SAMPLE_BYTES_PER_DOC = 1_000;

/** An illustrative document count for a sample index or data stream of the given size. */
export const getSampleDocsCount = (sizeInBytes: number): number =>
  Math.round(sizeInBytes / SAMPLE_BYTES_PER_DOC);

// The sample data streams are also only days old, so they get an illustrative history: 90 days of
// steady ingest, rolled over daily for the last 30 days and weekly before that.
const SAMPLE_HISTORY_DAYS = 90;
const DAILY_ROLLOVER_DAYS = 30;
const WEEKLY_ROLLOVER_DAYS = 7;

/** Spreads a sample data stream's illustrative size over illustrative backing indices, by age. */
export const getSampleDataAges = (sizeInBytes: number): BoostDataAge[] => {
  const bytesPerDay = sizeInBytes / SAMPLE_HISTORY_DAYS;
  const ages: BoostDataAge[] = [];
  let day = 0;
  while (day < SAMPLE_HISTORY_DAYS) {
    const days =
      day < DAILY_ROLLOVER_DAYS ? 1 : Math.min(WEEKLY_ROLLOVER_DAYS, SAMPLE_HISTORY_DAYS - day);
    ages.push({ age_hours: day * 24, size_in_bytes: bytesPerDay * days });
    day += days;
  }
  return ages;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { Builder, LeafPrinter, esql } from '@elastic/esql';
import { ALERT_EVENTS_DATA_STREAM, TIME_FIELD } from './constants';

const metricColumn = (label: string): string =>
  LeafPrinter.column(Builder.expression.column(label));

const dataSelector = (label: string): string =>
  LeafPrinter.string({ valueUnquoted: `data['${label.replace(/['\\]/g, '\\$&')}']` });

export const buildEpisodeTrendQuery = (
  spaceId: string,
  episodeId: string,
  metricLabels: string[]
): ComposerQuery => {
  let query = esql.from([ALERT_EVENTS_DATA_STREAM], ['_source'])
    .where`space_id == ${spaceId}`
    .where`type == "alert"`
    .where`episode.id == ${episodeId}`;

  metricLabels.forEach((label) => {
    query = query.pipe(
      `EVAL ${metricColumn(label)} = JSON_EXTRACT(_source, ${dataSelector(label)})`
    );
  });

  return query.sort([TIME_FIELD, 'ASC']).keep('@timestamp', 'episode.status', ...metricLabels);
};

export const parseEpisodeTrendRows = (
  rawRows: Array<Record<string, unknown>>,
  metricLabels: string[]
): Array<{ '@timestamp': string; 'episode.status': string; metrics: Record<string, number | null> }> =>
  rawRows.map((row) => ({
    '@timestamp': row['@timestamp'] as string,
    'episode.status': row['episode.status'] as string,
    metrics: Object.fromEntries(
      metricLabels.map((label) => {
        const val = row[label];
        const num = typeof val === 'number' ? val : typeof val === 'string' ? Number(val) : NaN;
        return [label, Number.isFinite(num) ? num : null];
      })
    ),
  }));

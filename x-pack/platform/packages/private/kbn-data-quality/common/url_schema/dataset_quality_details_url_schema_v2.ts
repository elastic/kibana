/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { dataStreamRT, degradedFieldRT, qualityIssuesRT, timeRangeRT } from './common';

export const isStream = (
  value: unknown
): value is { dataStream: string; view: 'classic' | 'wired' } =>
  rt.type({ dataStream: rt.string, view: rt.literal('classic') }).is(value) ||
  rt.type({ dataStream: rt.string, view: rt.literal('wired') }).is(value);

export const urlSchemaRT = rt.union([
  // Case 1: view === 'classic' (classic Streams), dataStream is string
  rt.intersection([
    rt.type({
      dataStream: rt.string,
      view: rt.literal('classic'),
    }),
    rt.partial({
      v: rt.literal(2),
      timeRange: timeRangeRT,
      qualityIssuesChart: qualityIssuesRT,
      breakdownField: rt.string,
      qualityIssues: degradedFieldRT,
      expandedQualityIssue: rt.type({
        name: rt.string,
        type: qualityIssuesRT,
      }),
      showCurrentQualityIssues: rt.boolean,
    }),
  ]),
  // Case 2: view === 'wired' (wired Streams), dataStream is string
  rt.intersection([
    rt.type({
      dataStream: rt.string,
      view: rt.literal('wired'),
    }),
    rt.partial({
      v: rt.literal(2),
      timeRange: timeRangeRT,
      qualityIssuesChart: qualityIssuesRT,
      breakdownField: rt.string,
      qualityIssues: degradedFieldRT,
      expandedQualityIssue: rt.type({
        name: rt.string,
        type: qualityIssuesRT,
      }),
      showCurrentQualityIssues: rt.boolean,
    }),
  ]),
  // Case 3: dataStream is dataStreamRT (data quality app)
  rt.intersection([
    rt.type({
      dataStream: dataStreamRT,
    }),
    rt.partial({
      v: rt.literal(2),
      timeRange: timeRangeRT,
      qualityIssuesChart: qualityIssuesRT,
      breakdownField: rt.string,
      qualityIssues: degradedFieldRT,
      expandedQualityIssue: rt.type({
        name: rt.string,
        type: qualityIssuesRT,
      }),
      showCurrentQualityIssues: rt.boolean,
    }),
  ]),
]);

export type UrlSchema = rt.TypeOf<typeof urlSchemaRT>;

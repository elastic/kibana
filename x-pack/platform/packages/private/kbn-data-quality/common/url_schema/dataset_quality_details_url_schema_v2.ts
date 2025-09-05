/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { streamRT, dataStreamRT, degradedFieldRT, qualityIssuesRT, timeRangeRT } from './common';

export const urlSchemaRT = (isStream: boolean) =>
  rt.exact(
    rt.intersection([
      rt.type({
        dataStream: isStream ? streamRT : dataStreamRT,
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
    ])
  );

export type UrlSchema = rt.TypeOf<ReturnType<typeof urlSchemaRT>>;

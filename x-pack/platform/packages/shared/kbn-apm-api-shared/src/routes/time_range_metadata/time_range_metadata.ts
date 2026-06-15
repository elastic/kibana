/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { toBooleanRt } from '@kbn/io-ts-utils';
import type { TimeRangeMetadata } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt } from '../../default_api_types';

export type TimeRangeMetadataResponse = TimeRangeMetadata;

export const timeRangeMetadataRoute = defineRoute<TimeRangeMetadataResponse>()({
  endpoint: 'GET /internal/apm/time_range_metadata',
  params: t.type({
    query: t.intersection([t.type({ useSpanName: toBooleanRt }), kueryRt, rangeRt]),
  }),
});

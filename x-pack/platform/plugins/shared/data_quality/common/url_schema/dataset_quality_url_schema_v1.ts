/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { tableRT, timeRangeRT } from './common';

export const filtersRT = rt.exact(
  rt.partial({
    inactive: rt.boolean,
    fullNames: rt.boolean,
    timeRange: timeRangeRT,
    types: rt.array(rt.string),
    integrations: rt.array(rt.string),
    namespaces: rt.array(rt.string),
    qualities: rt.array(rt.union([rt.literal('poor'), rt.literal('degraded'), rt.literal('good')])),
    query: rt.string,
  })
);

export const urlSchemaRT = rt.exact(
  rt.partial({
    v: rt.literal(1),
    table: tableRT,
    filters: filtersRT,
  })
);

export type UrlSchema = rt.TypeOf<typeof urlSchemaRT>;

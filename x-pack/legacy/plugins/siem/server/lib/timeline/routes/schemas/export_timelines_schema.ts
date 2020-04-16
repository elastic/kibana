/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const exportTimelinesQuerySchema = rt.type({
  file_name: rt.string,
  exclude_export_details: rt.union([rt.literal('true'), rt.literal('false')]),
});

export const exportTimelinesRequestBodySchema = rt.type({
  ids: rt.array(rt.string),
});

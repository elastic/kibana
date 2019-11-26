/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const LOGS_SUMMARY_PATH = '/api/logs/summary';

const esDate = rt.union([rt.string, rt.number]);

export const logsSummaryRequestRT = rt.type({
  startDate: esDate,
  endDate: esDate,
});

export const logsSummaryResponseRT = rt.type({
  buckets: rt.array(
    rt.type({
      key_as_string: rt.string,
      key: rt.number,
      doc_count: rt.number,
    })
  ),
});

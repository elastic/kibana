/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export type CaseSummaryResponse = rt.TypeOf<typeof CaseSummaryResponseRt>;

export const CaseSummaryRequestRt = rt.strict({
  /**
   * The id of inference connector.
   */
  connectorId: rt.string,
});

export const CaseSummaryResponseRt = rt.strict({
  /**
   * response from LLM
   */
  content: rt.string,
  generatedAt: rt.string,
});

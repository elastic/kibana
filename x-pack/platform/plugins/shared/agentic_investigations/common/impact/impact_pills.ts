/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposalOrigin } from '@kbn/proposals-common';
import type { ImpactPill } from '@kbn/agentic-investigations-common';

export interface ImpactPillsResponse {
  pills: ImpactPill[];
  total: number;
  remaining: number;
}

export interface ImpactPillsPageQuery {
  from: number;
  size: number;
}

/** The queue the pills describe: open proposals of `categories`, plus those decided within the window. */
export interface ProposalImpactPillsQuery extends ImpactPillsPageQuery {
  origin: ProposalOrigin;
  categories: string[];
  decidedWithinHours?: number;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compareLeads, type InvestigationLead } from '@kbn/signal-investigation-contract';

export { compareLeads };

/** Ranks leads across analyzers and keeps each lead's 1-based position stable for feedback. */
export const rankLeads = (leads: readonly InvestigationLead[]): InvestigationLead[] =>
  [...leads].sort(compareLeads);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InvestigationLead,
  LeadRelationship,
  LeadSignalBand,
  LeadTimingBand,
} from './analyzer';

const SIGNAL_ORDER: Record<LeadSignalBand, number> = {
  strong: 0,
  moderate: 1,
  weak: 2,
  unknown: 3,
};

const TIMING_ORDER: Record<LeadTimingBand, number> = {
  before: 0,
  during: 1,
  after: 2,
  unknown: 3,
};

const RELATIONSHIP_ORDER: Record<LeadRelationship, number> = {
  service: 0,
  user: 1,
  network: 2,
  dependency: 3,
  host: 4,
  unknown: 5,
};

/**
 * Same service before a dependency before a host, then timing, then signal strength.
 * There is no fused score: each factor stays separate.
 */
export const compareLeads = (a: InvestigationLead, b: InvestigationLead): number => {
  const relationship =
    RELATIONSHIP_ORDER[a.ranking.relationship] - RELATIONSHIP_ORDER[b.ranking.relationship];
  if (relationship !== 0) {
    return relationship;
  }

  const timing = TIMING_ORDER[a.ranking.timing] - TIMING_ORDER[b.ranking.timing];
  if (timing !== 0) {
    return timing;
  }

  const signal = SIGNAL_ORDER[a.ranking.signal] - SIGNAL_ORDER[b.ranking.signal];
  if (signal !== 0) {
    return signal;
  }

  return (a.occurredAt ?? '').localeCompare(b.occurredAt ?? '');
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type {
  InvestigationHypothesis,
  InvestigationRecommendation,
  InvestigationBlindSpot,
  InvestigationImpact,
} from '@kbn/significant-events-schema';

/**
 * Minimal structural interface for the fields the investigation attachment types
 * need from the nightshiftInvestigations client response.
 *
 * Kept local so agenticInvestigations does not create a circular module
 * dependency on @kbn/nightshift-investigations-plugin, which already requires
 * this plugin.
 */
export interface NsiGetInvestigationResult {
  hypotheses?: InvestigationHypothesis[];
  recommendations?: InvestigationRecommendation[];
  blind_spots?: InvestigationBlindSpot[];
  impact?: InvestigationImpact;
  /** ISO timestamp set when the investigation terminates; used for staleness checks. */
  completed_at?: string;
}

/**
 * Minimal structural interface for the nightshiftInvestigations investigations
 * client, covering only the method the attachment types invoke.
 */
export interface NsiInvestigationsClientLike {
  get(investigationId: string): Promise<NsiGetInvestigationResult>;
}

/**
 * Factory that creates a per-request NSI investigations client scoped to the
 * given request and space. Implemented by the agenticInvestigations plugin by
 * delegating to the nightshiftInvestigations optional start contract.
 */
export type GetNsiClient = (request: KibanaRequest, spaceId: string) => NsiInvestigationsClientLike;

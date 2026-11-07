/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface PriorOutcome {
  case_id: string;
  title: string;
  incremental_id?: number;
  close_reason?: string;
  human_verdict?: string;
  closed_at?: string;
}

export type PriorOutcomesResponse =
  | {
      /** False when the context engine is off or the caller can't read the knowledge index. */
      available: false;
    }
  | {
      available: true;
      days: number;
      /** Matching outcomes, newest first, at most `MAX_PRIOR_OUTCOMES`. */
      outcomes: PriorOutcome[];
      /** How many outcomes matched, up to the query limit; can exceed `outcomes.length`. */
      total: number;
      /** How many matching outcomes closed with each close reason. */
      close_reasons: Record<string, number>;
    };

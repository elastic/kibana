/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import {
  AGENTIC_INVESTIGATIONS_API_VERSION,
  INVESTIGATIONS_INTERNAL_URL,
  type InvestigationSummary,
  type ListInvestigationsResponse,
} from '../../common';

/** Matches the list API's bound on the `id` filter. */
const MAX_IDS_PER_REQUEST = 100;

interface Waiter {
  resolve: (investigation: InvestigationSummary | undefined) => void;
  reject: (error: Error) => void;
}

export interface InvestigationCardsLoader {
  /** The investigation's list summary, or undefined when the caller cannot read it. */
  load: (id: string) => Promise<InvestigationSummary | undefined>;
}

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

/**
 * Batches the reads of every card rendered in the same tick into one list call per hundred ids,
 * so a page of cards costs one request rather than one each.
 */
export const createInvestigationCardsLoader = (http: HttpStart): InvestigationCardsLoader => {
  let queued = new Map<string, Waiter[]>();
  let scheduled = false;

  const flush = async () => {
    const batch = queued;
    queued = new Map();
    scheduled = false;

    const ids = [...batch.keys()];
    for (let start = 0; start < ids.length; start += MAX_IDS_PER_REQUEST) {
      const chunk = ids.slice(start, start + MAX_IDS_PER_REQUEST);
      try {
        const { results } = await http.get<ListInvestigationsResponse>(
          INVESTIGATIONS_INTERNAL_URL,
          {
            version: AGENTIC_INVESTIGATIONS_API_VERSION,
            query: { id: chunk, per_page: chunk.length },
          }
        );
        const byId = new Map(results.map((investigation) => [investigation.id, investigation]));
        for (const id of chunk) {
          batch.get(id)?.forEach(({ resolve }) => resolve(byId.get(id)));
        }
      } catch (error) {
        for (const id of chunk) {
          batch.get(id)?.forEach(({ reject }) => reject(toError(error)));
        }
      }
    }
  };

  return {
    load: (id) =>
      new Promise((resolve, reject) => {
        queued.set(id, [...(queued.get(id) ?? []), { resolve, reject }]);
        if (!scheduled) {
          scheduled = true;
          setTimeout(() => void flush(), 0);
        }
      }),
  };
};

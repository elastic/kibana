/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';
import type { LogPattern } from '../../../../../common/services/semantic_log_search/types';
import {
  MAX_RERANK_INPUT_LENGTH,
  MIN_RERANK_INPUT_LENGTH,
  RERANK_INPUT_TOTAL_CHAR_BUDGET,
} from '../../constants';
import { MESSAGE_FIELD } from './columns';

// The pattern repeats most of the sample's tokens, but dropping it moved rankings on 2 of 5 probe
// queries, so both are sent until an eval run settles it.
function toCandidateText({ pattern, sample }: LogPattern): string {
  const message = sample?.[MESSAGE_FIELD];
  return typeof message === 'string' && message ? `${pattern} ${message}` : pattern;
}

/** Builds the rerank input for a candidate set, trimming the longest candidates to fit the character budget. */
export function buildRerankInputs(
  candidates: LogPattern[],
  budget: number = RERANK_INPUT_TOTAL_CHAR_BUDGET
): string[] {
  const texts = candidates.map((candidate) =>
    toCandidateText(candidate).slice(0, MAX_RERANK_INPUT_LENGTH)
  );

  const total = texts.reduce((sum, text) => sum + text.length, 0);
  if (total <= budget) return texts;

  // Water-filling: shortest first, each taking an equal share of what is left, so the surplus from
  // candidates under their share passes to the ones over it. Trimming text weakens a candidate,
  // whereas dropping one hides a pattern from the caller, so every candidate keeps a slot.
  const shortestFirst = sortBy(
    texts.map((text, index) => ({ index, length: text.length })),
    'length'
  );
  const limits = new Array<number>(texts.length);
  let remaining = Math.max(budget, texts.length * MIN_RERANK_INPUT_LENGTH);

  shortestFirst.forEach(({ index, length }, position) => {
    const share = Math.floor(remaining / (shortestFirst.length - position));
    // The floor must not lift a limit above the candidate's own length, or short candidates would
    // reserve budget they never use and the long ones would be trimmed to pay for it.
    limits[index] = Math.min(length, Math.max(MIN_RERANK_INPUT_LENGTH, share));
    remaining -= limits[index];
  });

  return texts.map((text, index) => text.slice(0, limits[index]));
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chatSystemIndex } from '@kbn/agent-builder-server';
import type { ConsumptionSortField } from '../../../common/http_api/consumption';

/** Conversations index resolved from the chat system index helper. */
export const conversationIndexName = chatSystemIndex('conversations');

/** Rounds with input tokens above this value are flagged as high-token warnings. */
export const HIGH_INPUT_TOKEN_THRESHOLD = 200_000;

/**
 * Painless script that iterates over conversation_rounds (or legacy `rounds`)
 * and sums input_tokens across all rounds in a single conversation document.
 */
export const INPUT_TOKENS_SCRIPT = `
  def source = params._source;
  def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;
  long total = 0;
  if (roundsArray != null) {
    for (def round : roundsArray) {
      if (round.model_usage != null) {
        total += round.model_usage.input_tokens != null ? round.model_usage.input_tokens : 0;
      }
    }
  }
  return total;
`;

/** Painless script that sums output_tokens across all rounds. */
export const OUTPUT_TOKENS_SCRIPT = `
  def source = params._source;
  def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;
  long total = 0;
  if (roundsArray != null) {
    for (def round : roundsArray) {
      if (round.model_usage != null) {
        total += round.model_usage.output_tokens != null ? round.model_usage.output_tokens : 0;
      }
    }
  }
  return total;
`;

/** Painless script that returns the number of rounds in a conversation. */
export const ROUND_COUNT_SCRIPT = `
  def source = params._source;
  def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;
  return roundsArray != null ? roundsArray.size() : 0;
`;

/** Painless script that sums llm_calls across all rounds. */
export const LLM_CALLS_SCRIPT = `
  def source = params._source;
  def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;
  long total = 0;
  if (roundsArray != null) {
    for (def round : roundsArray) {
      if (round.model_usage != null) {
        total += round.model_usage.llm_calls != null ? round.model_usage.llm_calls : 0;
      }
    }
  }
  return total;
`;

/**
 * Returns an array of maps with {round_id, input_tokens} for any round
 * whose input_tokens exceed the given threshold parameter.
 */
export const HIGH_TOKEN_ROUNDS_SCRIPT = `
  def source = params._source;
  def threshold = params.threshold;
  def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;
  def results = [];
  if (roundsArray != null) {
    for (def round : roundsArray) {
      if (round.model_usage != null) {
        def tokens = round.model_usage.input_tokens != null ? round.model_usage.input_tokens : 0;
        if (tokens > threshold) {
          def entry = new HashMap();
          entry.put('round_id', round.id != null ? round.id : 'unknown');
          entry.put('input_tokens', tokens);
          results.add(entry);
        }
      }
    }
  }
  return results;
`;

/** Sums input_tokens + output_tokens across all rounds for sorting by total tokens. */
export const TOTAL_TOKENS_SORT_SCRIPT = `
  def source = params._source;
  def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;
  long total = 0;
  if (roundsArray != null) {
    for (def round : roundsArray) {
      if (round.model_usage != null) {
        total += round.model_usage.input_tokens != null ? round.model_usage.input_tokens : 0;
        total += round.model_usage.output_tokens != null ? round.model_usage.output_tokens : 0;
      }
    }
  }
  return total;
`;

/**
 * Builds the sort clause for the ES query. For `updated_at` we sort on the
 * native date field; for computed fields (`total_tokens`, `round_count`) we
 * use a `_script` sort with the same Painless logic used in script_fields.
 */
export const buildSortClause = (sortField: ConsumptionSortField, sortOrder: 'asc' | 'desc') => {
  const tiebreaker = { created_at: { order: 'asc' as const } };

  if (sortField === 'updated_at') {
    return [{ updated_at: { order: sortOrder } }, tiebreaker];
  }

  const scriptSource = sortField === 'total_tokens' ? TOTAL_TOKENS_SORT_SCRIPT : ROUND_COUNT_SCRIPT;

  return [
    {
      _script: {
        type: 'number' as const,
        script: { source: scriptSource, lang: 'painless' },
        order: sortOrder,
      },
    },
    tiebreaker,
  ];
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEvaluators } from '@kbn/evals';
import { skippedResult } from '../evaluator_utils';
import { findAskUserQuestionPrompt } from '../extract_dashboard';
import type { DashboardAgentEvaluator } from '../types';
import { getControlReplyCriteria } from './control_sourcing';
import { getReplaceReplyCriteria } from './replace_confirmation';
import { getUnavailableReplyCriteria } from './unavailable_requests';

export const DASHBOARD_REPLY_EVALUATOR_NAME = 'Dashboard Reply';

/**
 * Judges whether the agent told the user what it could not do: requests the
 * data cannot back, panels it must replace rather than edit, and requested
 * controls it could not add. The criteria come from the gold and the stored
 * dashboard; an LLM judge reads only the user's question, the agent's last
 * reply and the questions it asked with their options, so wording does not need to match a pattern.
 */
export const createReplyEvaluator = (evaluators: DefaultEvaluators): DashboardAgentEvaluator => ({
  name: DASHBOARD_REPLY_EVALUATOR_NAME,
  kind: 'LLM',
  direction: 'maximize',
  evaluate: async ({ input, expected, output, metadata }) => {
    const criteria = [
      ...getUnavailableReplyCriteria(expected),
      ...getReplaceReplyCriteria(expected, output),
      ...getControlReplyCriteria(expected, output),
    ];
    if (criteria.length === 0) {
      return skippedResult('No reply criteria for this example.');
    }
    const prompt = findAskUserQuestionPrompt(output.openingPrompts ?? []);
    return evaluators.criteria(criteria).evaluate({
      input: { question: input?.question },
      expected: {},
      output: {
        reply: output.messages.at(-1)?.message ?? '',
        questionsAsked: (prompt?.questions ?? []).map(({ question, options }) => ({
          question,
          options: options.map(({ label, description }) => ({ label, description })),
        })),
      },
      metadata,
    });
  },
});

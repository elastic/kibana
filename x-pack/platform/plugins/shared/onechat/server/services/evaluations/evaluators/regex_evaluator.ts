/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluatorFunction } from '../types';

export const createRegexEvaluator = (): EvaluatorFunction => {
  return async (context) => {
    const { currentRound, customInstructions } = context;

    if (typeof customInstructions !== 'string') {
      throw new Error(
        `Regex evaluator requires customInstructions to be a string, got ${typeof customInstructions}`
      );
    }

    let regex: RegExp;
    try {
      regex = new RegExp(customInstructions);
    } catch (error) {
      throw new Error(
        `Invalid regex pattern: ${customInstructions}. Error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    const responseMessage = currentRound.response.message;
    const match = regex.test(responseMessage);

    return { score: match ? 1 : 0 };
  };
};

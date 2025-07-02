/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class Tokenizer {
  /**
   * Approximates the number of tokens in a string,
   * assuming 4 characters per token.
   */
  static count(input: string): number {
    return Math.ceil(input.length / 4);
  }

  /**
   * If the text is longer than the amount of tokens,
   * truncate and mark as truncated.
   */
  static truncate(
    input: string,
    maxTokens: number
  ): { tokens: number; truncated: boolean; text: string } {
    const count = Tokenizer.count(input);
    if (Tokenizer.count(input) > maxTokens) {
      const maxChars = maxTokens * 4;
      return { truncated: true, tokens: count, text: input.slice(0, maxChars) + '... <truncated>' };
    }
    return { truncated: false, tokens: count, text: input };
  }
}

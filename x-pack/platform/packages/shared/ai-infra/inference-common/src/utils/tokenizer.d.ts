/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export declare class Tokenizer {
  /**
   * Approximates the number of tokens in a string,
   * assuming 4 characters per token.
   */
  static count(input: string): number;
  /**
   * If the text is longer than the amount of tokens,
   * truncate and mark as truncated.
   */
  static truncate(
    input: string,
    maxTokens: number
  ): {
    tokens: number;
    truncated: boolean;
    text: string;
  };
}

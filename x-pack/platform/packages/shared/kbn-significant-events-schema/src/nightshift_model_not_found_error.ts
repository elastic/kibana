/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class NightshiftModelNotFoundError extends Error {
  constructor(modelId: string) {
    super(
      `Model "${modelId}" was not found. Pass a chat model connector or inference endpoint id, for example ".anthropic-claude-4.6-sonnet-chat_completion".`
    );
    this.name = 'NightshiftModelNotFoundError';
  }
}

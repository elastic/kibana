/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';

interface AttemptOutcome {
  readonly attempt: number;
  readonly success: boolean;
  /** Raw model response of an authoring attempt. */
  readonly response?: string;
  readonly error?: string;
}

/**
 * Replays each failed attempt as the model's own response followed by its error,
 * so the next attempt repairs that response instead of starting over.
 */
export const formatRepairMessages = ({
  authored,
  validated,
  instructions,
}: {
  authored: readonly AttemptOutcome[];
  validated: readonly AttemptOutcome[];
  instructions: string;
}): BaseMessageLike[] =>
  validated.flatMap(({ attempt, success, error }): BaseMessageLike[] => {
    const response = authored.find((outcome) => outcome.attempt === attempt)?.response;
    // Without a response (e.g. the model call itself failed) there is nothing to repair.
    if (success || !response || !error) {
      return [];
    }
    return [
      ['ai', response],
      [
        'human',
        `Your previous response was rejected with this error:\n\n\`\`\`\n${error}\n\`\`\`\n\n${instructions}`,
      ],
    ];
  });

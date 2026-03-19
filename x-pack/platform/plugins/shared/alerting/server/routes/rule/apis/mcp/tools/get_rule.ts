/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '../../../../../rules_client';

export const getRuleTool = async (id: string, rulesClient: RulesClient) => {
  try {
    const rule = await rulesClient.get({ id });
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(rule, null, 2) }],
    };
  } catch (err) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ error: String(err) }),
        },
      ],
      isError: true,
    };
  }
};

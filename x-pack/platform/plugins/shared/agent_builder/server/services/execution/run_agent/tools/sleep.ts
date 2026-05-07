/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, internalTools } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createOtherResult } from '@kbn/agent-builder-server';

export const SleepToolName = internalTools.sleepTool;

const MAX_SLEEP_SECONDS = 120;

const schema = z.object({
  duration: z.number().describe('Duration to sleep for, in seconds'),
});

const description = `Wait for a specified duration.

## Usage notes

- Only use this when the user tells you to sleep or rest, or explicitly allows you to wait for something to complete
- **NEVER** sleep for more than 2 minutes (120s)
`;

export const createSleepTool = (): BuiltinToolDefinition<typeof schema> => {
  return {
    id: SleepToolName,
    description,
    type: ToolType.builtin,
    schema,
    tags: ['system'],
    handler: async ({ duration }) => {
      const clampedDuration = Math.min(Math.max(0, duration), MAX_SLEEP_SECONDS);
      await sleep(clampedDuration);

      return {
        results: [createOtherResult({ slept_for_seconds: clampedDuration })],
      };
    },
  };
};

const sleep = async (durationSec: number) => {
  await new Promise((resolve) => setTimeout(resolve, durationSec * 1000));
};

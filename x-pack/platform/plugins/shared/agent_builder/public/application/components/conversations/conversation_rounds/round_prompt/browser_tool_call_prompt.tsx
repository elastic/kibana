/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import type {
  BrowserToolCallPrompt as BrowserToolCallPromptRequest,
  BrowserToolCallPromptResponse,
} from '@kbn/agent-builder-common/agents/prompts';

/**
 * How long the handler is given to settle before the round is resumed with an error.
 * Without it, a handler that never settles would leave the round awaiting a prompt forever.
 */
const HANDLER_TIMEOUT_MS = 30_000;

/**
 * Ordinary (json) results stay small; image results carry a data URL and are bounded by the
 * converse route's `result` schema cap (3.1M chars) instead. Keep the image bound in sync with
 * that schema.
 */
const MAX_RESULT_LENGTH = 50_000;
const MAX_IMAGE_RESULT_LENGTH = 3_100_000;

export interface BrowserToolCallPromptProps {
  prompt: BrowserToolCallPromptRequest;
  /** Undefined when the page no longer registers the tool the agent called. */
  tool?: BrowserApiToolDefinition<any>;
  onComplete: (response: BrowserToolCallPromptResponse) => void;
}

/**
 * Runs a two-way browser API tool the agent called, and reports the outcome back so the round
 * can resume. Renders nothing: the agent is waiting on the browser, not on the user.
 */
export const BrowserToolCallPrompt = ({ prompt, tool, onComplete }: BrowserToolCallPromptProps) => {
  // The handler may have side effects, so it must run exactly once per prompt - regardless of
  // how often this component re-renders.
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;

    let timeoutId: ReturnType<typeof setTimeout>;

    const execute = async (): Promise<BrowserToolCallPromptResponse> => {
      if (!tool) {
        return { error: `Browser tool '${prompt.tool_id}' is not registered on this page.` };
      }

      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(`Timed out after ${HANDLER_TIMEOUT_MS}ms.`)),
          HANDLER_TIMEOUT_MS
        );
      });

      try {
        const result = await Promise.race([
          Promise.resolve(tool.handler(tool.schema.parse(prompt.params))),
          timeout,
        ]);

        const encoded = JSON.stringify(result ?? null);
        if (encoded === undefined) {
          return { error: 'Result is not JSON-serializable.' };
        }
        const maxLength = tool.resultType === 'image' ? MAX_IMAGE_RESULT_LENGTH : MAX_RESULT_LENGTH;
        if (encoded.length > maxLength) {
          return {
            error: `Result is too large (${encoded.length} characters, limit is ${maxLength}).`,
          };
        }
        return { result: encoded };
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      } finally {
        clearTimeout(timeoutId);
      }
    };

    void execute().then(onComplete);
  }, [prompt, tool, onComplete]);

  return null;
};

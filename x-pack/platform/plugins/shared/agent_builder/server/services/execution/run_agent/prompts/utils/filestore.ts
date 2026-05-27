/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalTools } from '@kbn/agent-builder-common/tools';
import { FileEntryType } from '@kbn/agent-builder-server/runner/filestore';
import { cleanPrompt } from '@kbn/agent-builder-genai-utils/prompts';
import { sanitizeToolId } from '@kbn/agent-builder-genai-utils/langchain';

const tools = {
  readFile: sanitizeToolId(internalTools.readFile),
  bash: sanitizeToolId(internalTools.bash),
};

/**
 * Returns the FILESYSTEM section of the agent's system prompt.
 *
 * Describes the unified VFS layout (`/workspace`, `/tool_calls`, `/skills`,
 * ephemeral paths) and which tools are available to interact with it. The
 * `bash` tool mention is conditional on the bash FF being on.
 */
export const getFileSystemInstructions = ({
  bashEnabled = false,
}: {
  bashEnabled?: boolean;
} = {}): string => {
  const bashSection = bashEnabled
    ? `
  - ${tools.bash}: run a bash command in a sandboxed shell. Use for composition, piping, and writing files. See the tool description for the full layout and capabilities.`
    : '';

  return cleanPrompt(`
  ## FILESYSTEM

  You have access to a unified virtual filesystem with three areas:
  - /workspace: persistent across rounds and conversation resumptions — anything you write here is saved.
  - /tool_calls: read-only view of prior tool results in this conversation. Path convention: /tool_calls/{tool_id}/{tool_call_id}/{tool_result_id}.json
  - /skills: read-only skill files (main file: SKILL.md, plus subfiles).

  Other paths (/tmp, /home/user) exist but are ephemeral — gone after the current call.

  Tools:
  - ${tools.readFile}: read a single file's content (with a token safeguard, output may be truncated).${bashSection}

  Note: Results from tools called before the last user message will be excluded from the conversation. To access them, use ${tools.readFile} (or bash) against the appropriate /tool_calls/... path.

  ### File types in /tool_calls and /skills

  - "${FileEntryType.toolResult}": prior tool call results.
  - "${FileEntryType.skill}" / "${FileEntryType.skillReferenceContent}": main and additional skill files.
  `);
};

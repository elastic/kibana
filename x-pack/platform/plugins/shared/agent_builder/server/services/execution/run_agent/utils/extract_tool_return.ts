/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray } from 'lodash';
import type { RunToolReturn } from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';

/**
 * Recovers the structured tool return ({ results }) from an in-flight tool result,
 * which carries the structured payload on `artifact`. Falls back to an error result
 * for langchain tool-validation errors (schema errors), which emit no artifact.
 */
export const extractToolReturn = ({
  content,
  artifact,
}: {
  content: string;
  artifact?: unknown;
}): RunToolReturn => {
  if (artifact) {
    const structured = artifact as { results?: unknown };
    if (!isArray(structured.results)) {
      throw new Error(
        `Artifact is not a structured tool artifact. Received artifact=${JSON.stringify(artifact)}`
      );
    }
    return artifact as RunToolReturn;
  }
  // langchain tool validation errors (such as schema errors) are out of our control and emit no artifact
  if (content.startsWith('Error:')) {
    return { results: [createErrorResult(content)] };
  }
  throw new Error(`No artifact attached to tool message: ${JSON.stringify({ content })}`);
};

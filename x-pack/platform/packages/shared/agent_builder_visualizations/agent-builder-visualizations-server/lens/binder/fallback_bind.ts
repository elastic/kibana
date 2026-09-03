/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { ClassifiedColumn } from './classify_columns';

export interface FallbackBindRequest {
  slot: string;
  candidates: string[];
  columns: ClassifiedColumn[];
}

export type FallbackBindInvoker = (prompt: string) => Promise<string>;

export type FallbackBindResult =
  | { column: string }
  | { ambiguous: string; candidates: string[] }
  | { error: string };

const fallbackResponseSchema = z.object({
  column: z.string(),
});

export const buildFallbackBindPrompt = ({
  slot,
  candidates,
  columns,
}: FallbackBindRequest): string => {
  const listed = columns
    .map((column) => `- ${column.name} (${column.type}, ${column.role})`)
    .join('\n');
  return [
    `Choose the ${slot} column.`,
    `Candidates: ${candidates.join(', ')}`,
    'Columns:',
    listed,
    'Reply with JSON {"column":"<name>"}.',
  ].join('\n');
};

export const fallbackBind = async (
  request: FallbackBindRequest,
  invoke: FallbackBindInvoker
): Promise<FallbackBindResult> => {
  const raw = await invoke(buildFallbackBindPrompt(request));
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: `fallback bind returned invalid JSON for ${request.slot}` };
  }
  const result = fallbackResponseSchema.safeParse(parsed);
  if (!result.success || !request.candidates.includes(result.data.column)) {
    return { ambiguous: request.slot, candidates: request.candidates };
  }
  return { column: result.data.column };
};

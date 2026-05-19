/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ToolResult as ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  isQueryResult,
  isEsqlResultsResult,
  isErrorResult,
} from '@kbn/agent-builder-common/tools/tool_result';
import { InlineQuery } from './inline_query';
import { InlineEsqlResults } from './inline_esql_results';
import { InlineError } from './inline_error';
import { OtherResult } from '../flyouts/other_result';

interface ToolResultProps {
  result: ToolResultType;
  /**
   * - `inline`: used inside a tool call's expanded sub-fields. Only renders types
   *   we know how to display inline (`query`, `esqlResults`, `error`); returns
   *   null for everything else (those are surfaced via the View response button).
   * - `flyout`: used inside ToolResponseFlyout. Falls back to a JSON dump for
   *   unrecognised types so the user always sees something.
   */
  mode: 'inline' | 'flyout';
}

/**
 * Dispatches a single ToolResult to the right renderer based on its `type`.
 *
 * The `inline` set of types is intentionally limited — only `query`,
 * `esqlResults`, and `error` render inside the tool call expansion. Everything
 * else is routed through the View response button → flyout.
 */
export const ToolResult: React.FC<ToolResultProps> = ({ result, mode }) => {
  if (isQueryResult(result)) return <InlineQuery result={result} />;
  if (isEsqlResultsResult(result)) return <InlineEsqlResults result={result} />;
  if (isErrorResult(result)) return <InlineError result={result} />;

  if (mode === 'flyout') return <OtherResult result={result} />;
  return null;
};

/**
 * Returns true if a result can be rendered inline inside a tool call's
 * expansion. Used to partition results into (inline-renderable, flyout-only).
 */
export const isInlineRenderableResult = (result: ToolResultType): boolean => {
  return isQueryResult(result) || isEsqlResultsResult(result) || isErrorResult(result);
};

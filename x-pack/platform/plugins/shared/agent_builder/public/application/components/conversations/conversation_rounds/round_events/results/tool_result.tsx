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
import { QueryResult } from './query_result';
import { EsqlResults } from './esql_results';
import { ToolErrorResult } from './tool_error_result';
import { JsonCodeBlock } from '../json_code_block';

interface ToolResultProps {
  result: ToolResultType;
}

export const ToolResult: React.FC<ToolResultProps> = ({ result }) => {
  if (isQueryResult(result)) return <QueryResult result={result} />;
  if (isEsqlResultsResult(result)) return <EsqlResults result={result} />;
  if (isErrorResult(result)) return <ToolErrorResult result={result} />;
  return <JsonCodeBlock data={result.data} />;
};

export const isInlineRenderableResult = (result: ToolResultType): boolean => {
  return isQueryResult(result) || isEsqlResultsResult(result) || isErrorResult(result);
};

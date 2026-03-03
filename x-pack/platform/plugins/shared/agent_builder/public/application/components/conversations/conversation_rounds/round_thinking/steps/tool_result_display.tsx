/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import {
  isQueryResult,
  isEsqlResultsResult,
  isErrorResult,
} from '@kbn/agent-builder-common/tools/tool_result';
import React from 'react';
import { EsqlResultsStep } from './esql_results_step';
import { OtherResultStep } from './other_result_step';
import { QueryResultStep } from './query_result_step';
import { ErrorResultStep } from './error_result_step';

interface ToolResultDisplayProps {
  toolResult: ToolResult;
}

export const ToolResultDisplay: React.FC<ToolResultDisplayProps> = ({ toolResult }) => {
  if (isQueryResult(toolResult)) {
    return <QueryResultStep result={toolResult} />;
  }
  if (isEsqlResultsResult(toolResult)) {
    return <EsqlResultsStep result={toolResult} />;
  }
  if (isErrorResult(toolResult)) {
    return <ErrorResultStep result={toolResult} />;
  }
  // Other results (`other` type and any type not specifically handled before)
  return <OtherResultStep result={toolResult} />;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolResult } from '@kbn/onechat-common/tools/tool_result';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import React from 'react';
import { TabularDataResultStep } from './tabular_data_result_step';
import { OtherResultStep } from './other_result_step';
import { QueryResultStep } from './query_result_step';
import { ErrorResultStep } from './error_result_step';

interface ToolResultDisplayProps {
  toolResult: ToolResult;
}

export const ToolResultDisplay: React.FC<ToolResultDisplayProps> = ({ toolResult }) => {
  switch (toolResult.type) {
    case ToolResultType.query:
      return <QueryResultStep result={toolResult} />;
    case ToolResultType.tabularData:
      return <TabularDataResultStep result={toolResult} />;
    case ToolResultType.error:
      return <ErrorResultStep result={toolResult} />;
    default:
      // Other results
      // Also showing Resource results as Other results for now as JSON blobs
      return <OtherResultStep result={toolResult} />;
  }
};

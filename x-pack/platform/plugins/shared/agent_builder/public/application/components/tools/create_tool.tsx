/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { useCreateTool } from '../../hooks/tools/use_create_tools';
import { Tool } from './tool';
import { ToolFormMode } from './form/tool_form';

export const TOOL_SOURCE_QUERY_PARAM = 'source_id';
export const TOOL_TYPE_QUERY_PARAM = 'tool_type';
export const TEST_TOOL_ID_QUERY_PARAM = 'test_tool_id';

export const CreateTool: React.FC = () => {
  const [searchParams] = useSearchParams();

  const { sourceTool, isSubmitting, isLoading, createTool } = useCreateTool({
    sourceToolId: searchParams.get(TOOL_SOURCE_QUERY_PARAM) ?? undefined,
  });

  return (
    <Tool
      mode={ToolFormMode.Create}
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      tool={sourceTool}
      saveTool={createTool}
    />
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { useCreateTool } from '../../../hooks/tools/use_create_tools';
import { IndexSearchTool } from './index_search_tool';
import { OnechatIndexSearchToolFormMode } from './form/index_search_tool_form';

export const TOOL_SOURCE_QUERY_PARAM = 'source_id';

export const CreateIndexSearchTool: React.FC = () => {
  const [searchParams] = useSearchParams();

  const { sourceTool, isSubmitting, isLoading, createTool } = useCreateTool({
    sourceToolId: searchParams.get(TOOL_SOURCE_QUERY_PARAM) ?? undefined,
  });

  return (
    <IndexSearchTool
      mode={OnechatIndexSearchToolFormMode.Create}
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      tool={sourceTool as any}
      saveTool={createTool}
    />
  );
};

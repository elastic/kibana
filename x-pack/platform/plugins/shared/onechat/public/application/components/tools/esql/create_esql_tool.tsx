/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { useCreateTool } from '../../../hooks/tools/use_create_tools';
import { EsqlTool } from './esql_tool';
import { OnechatEsqlToolFormMode } from './form/esql_tool_form';

export const TOOL_SOURCE_QUERY_PARAM = 'source_id';

export const CreateEsqlTool: React.FC = () => {
  const [searchParams] = useSearchParams();

  const { sourceTool, isSubmitting, isLoading, createTool } = useCreateTool({
    sourceToolId: searchParams.get(TOOL_SOURCE_QUERY_PARAM) ?? undefined,
  });

  return (
    <EsqlTool
      mode={OnechatEsqlToolFormMode.Create}
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      tool={sourceTool}
      saveTool={createTool}
    />
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { useTool } from '../../hooks/tools/use_tools';
import { ToolFormMode } from './form/tool_form';
import { Tool } from './tool';

export const ViewTool: React.FC = () => {
  const { toolId } = useParams<{ toolId: string }>();
  const { tool, isLoading } = useTool({ toolId });
  return <Tool mode={ToolFormMode.View} isLoading={isLoading} tool={tool} />;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { useEditTool } from '../../hooks/tools/use_edit_tools';
import { Tool } from './tool';
import { ToolFormMode } from './form/tool_form';

export const EditTool: React.FC = () => {
  const { toolId } = useParams<{ toolId: string }>();

  const {
    tool: editingTool,
    isSubmitting,
    isLoading,
    editTool,
  } = useEditTool({
    toolId,
  });

  return (
    <Tool
      mode={ToolFormMode.Edit}
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      tool={editingTool}
      saveTool={editTool}
    />
  );
};

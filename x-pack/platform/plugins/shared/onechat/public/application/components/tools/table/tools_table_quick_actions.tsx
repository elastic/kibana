/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup } from '@elastic/eui';
import { css } from '@emotion/react';
import { ToolDefinitionWithSchema } from '@kbn/onechat-common';
import React from 'react';
import { labels } from '../../../utils/i18n';

export const ToolQuickActions = ({
  tool,
  editTool,
  deleteTool,
}: {
  tool: ToolDefinitionWithSchema;
  editTool: (toolId: string) => void;
  deleteTool: (toolId: string) => void;
}) => {
  return (
    <EuiFlexGroup
      css={css`
        visibility: hidden;
      `}
      className="tool-quick-actions"
      gutterSize="s"
      alignItems="center"
      component="span"
    >
      <EuiButtonIcon
        iconType="documentEdit"
        onClick={() => {
          editTool(tool.id);
        }}
        aria-label={labels.tools.editToolButtonLabel}
      />
      <EuiButtonIcon
        iconType="trash"
        color="danger"
        onClick={() => {
          deleteTool(tool.id);
        }}
        aria-label={labels.tools.deleteToolButtonLabel}
      />
    </EuiFlexGroup>
  );
};

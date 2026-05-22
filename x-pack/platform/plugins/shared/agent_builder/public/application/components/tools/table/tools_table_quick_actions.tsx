/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ToolDefinition } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import React from 'react';
import { useToolsActions } from '../../../context/tools_provider';
import { labels } from '../../../utils/i18n';

export interface ToolQuickActionsProps {
  tool: ToolDefinition;
}

export const toolQuickActionsHoverStyles = css`
  .euiTableRow:hover .tool-quick-actions {
    visibility: visible;
  }
`;

export const ToolQuickActions = ({ tool }: ToolQuickActionsProps) => {
  const { editTool, deleteTool } = useToolsActions();

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
        data-test-subj="agentBuilderToolsRowEditButton"
        iconType="pencil"
        onClick={() => {
          editTool(tool.id);
        }}
        aria-label={labels.tools.editToolButtonLabel}
        {...getEbtProps({
          element: AGENT_BUILDER_UI_EBT.element.pageContent,
          action: AGENT_BUILDER_UI_EBT.action.globalManagement.MANAGE_ENTITY_EDIT,
          detail: AGENT_BUILDER_UI_EBT.entity.TOOL,
        })}
      />
      <EuiButtonIcon
        data-test-subj="agentBuilderToolsRowDeleteButton"
        iconType="trash"
        color="danger"
        onClick={() => {
          deleteTool(tool.id);
        }}
        aria-label={labels.tools.deleteToolButtonLabel}
        {...getEbtProps({
          element: AGENT_BUILDER_UI_EBT.element.pageContent,
          action: AGENT_BUILDER_UI_EBT.action.globalManagement.MANAGE_ENTITY_DELETE,
          detail: AGENT_BUILDER_UI_EBT.entity.TOOL,
        })}
      />
    </EuiFlexGroup>
  );
};

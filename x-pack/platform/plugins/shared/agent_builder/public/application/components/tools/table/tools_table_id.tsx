/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
  EuiTextTruncate,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ToolDefinition } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common/telemetry';
import React from 'react';
import { useToolsActions } from '../../../context/tools_provider';
import { labels } from '../../../utils/i18n';
import { truncateAtNewline } from '../../../utils/truncate_at_newline';

export interface ToolIdWithDescriptionProps {
  tool: ToolDefinition;
}

export const ToolIdWithDescription = ({ tool }: ToolIdWithDescriptionProps) => {
  const { euiTheme } = useEuiTheme();
  const { getEditToolUrl, getViewToolUrl } = useToolsActions();

  const toolIdStyle = css`
    font-weight: ${euiTheme.font.weight.semiBold};
  `;

  return (
    <EuiFlexGroup direction="column" gutterSize="xs" css={css({ minWidth: 0 })}>
      <EuiLink
        href={!tool.readonly ? getEditToolUrl(tool.id) : getViewToolUrl(tool.id)}
        data-ebt-element={AGENT_BUILDER_UI_EBT.element.MANAGE_TOOLS_TABLE}
        data-ebt-action={AGENT_BUILDER_UI_EBT.action.manageTools.TABLE_ROW_OPEN}
        data-ebt-detail={AGENT_BUILDER_UI_EBT.entity.TOOL}
      >
        <EuiText size="s" css={toolIdStyle}>
          {tool.id}
        </EuiText>
      </EuiLink>
      <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
        {tool.experimental && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{labels.tools.experimentalLabel}</EuiBadge>
          </EuiFlexItem>
        )}
        <EuiFlexItem css={css({ minWidth: 0 })}>
          <EuiText size="s" color="subdued" css={css({ minWidth: 0 })}>
            <EuiTextTruncate text={truncateAtNewline(tool.description)} truncation="end" />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};

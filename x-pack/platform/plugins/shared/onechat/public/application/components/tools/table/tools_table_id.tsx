/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ToolDefinitionWithSchema } from '@kbn/onechat-common';
import { isEsqlTool } from '@kbn/onechat-common/tools';
import React from 'react';
import { truncateAtNewline } from '../../../utils/truncate_at_newline';
import { useToolsActions } from '../../../context/tools_table_provider';

export interface ToolIdWithDescriptionProps {
  tool: ToolDefinitionWithSchema;
}

export const ToolIdWithDescription = ({ tool }: ToolIdWithDescriptionProps) => {
  const { euiTheme } = useEuiTheme();
  const { getEditToolUrl } = useToolsActions();

  const toolIdStyle = css`
    font-weight: ${euiTheme.font.weight.semiBold};
  `;

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      {isEsqlTool(tool) ? (
        <EuiLink href={getEditToolUrl(tool.id)}>
          <EuiText size="s" css={toolIdStyle}>
            {tool.id}
          </EuiText>
        </EuiLink>
      ) : (
        <EuiText size="s" css={toolIdStyle}>
          {tool.id}
        </EuiText>
      )}
      <EuiText size="s" color="subdued">
        {truncateAtNewline(tool.description)}
      </EuiText>
    </EuiFlexGroup>
  );
};

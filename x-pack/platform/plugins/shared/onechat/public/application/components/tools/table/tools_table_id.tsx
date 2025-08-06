/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ToolDefinitionWithSchema } from '@kbn/onechat-common';
import { isEsqlTool } from '@kbn/onechat-common/tools';
import React from 'react';
import { truncateAtNewline } from '../../../utils/truncate_at_newline';

export const ToolIdWithDescription = ({
  tool,
  editTool,
}: {
  tool: ToolDefinitionWithSchema;
  editTool: (toolId: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();

  const toolIdStyle = css`
    font-weight: ${euiTheme.font.weight.semiBold};
  `;

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      {isEsqlTool(tool) ? (
        <EuiLink onClick={() => editTool(tool.id)}>
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

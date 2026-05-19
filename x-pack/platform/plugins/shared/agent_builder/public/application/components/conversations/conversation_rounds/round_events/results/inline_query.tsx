/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiSplitPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { QueryResult } from '@kbn/agent-builder-common/tools/tool_result';

const codeblockStyles = css`
  word-break: break-word;
`;

const label = i18n.translate('xpack.agentBuilder.roundEvents.results.query.title', {
  defaultMessage: 'ESQL',
});

interface InlineQueryProps {
  result: QueryResult;
}

/**
 * Renders a `query` ToolResult inline as an ESQL code block.
 */
export const InlineQuery: React.FC<InlineQueryProps> = ({ result: { data } }) => (
  <EuiSplitPanel.Outer hasBorder hasShadow={false}>
    <EuiSplitPanel.Inner color="plain" grow={false} paddingSize="m">
      <EuiText size="s">
        <strong>{label}</strong>
      </EuiText>
    </EuiSplitPanel.Inner>
    <EuiSplitPanel.Inner paddingSize="none">
      <EuiCodeBlock language="esql" isCopyable paddingSize="m" lineNumbers css={codeblockStyles}>
        {data.esql}
      </EuiCodeBlock>
    </EuiSplitPanel.Inner>
  </EuiSplitPanel.Outer>
);

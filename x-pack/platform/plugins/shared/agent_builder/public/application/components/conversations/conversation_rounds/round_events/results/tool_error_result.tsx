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
import type { ErrorResult } from '@kbn/agent-builder-common/tools/tool_result';

const codeblockStyles = css`
  word-break: break-word;
`;

const label = i18n.translate('xpack.agentBuilder.roundEvents.results.error.title', {
  defaultMessage: 'Error',
});

interface ToolErrorResultProps {
  result: ErrorResult;
}

export const ToolErrorResult: React.FC<ToolErrorResultProps> = ({ result: { data } }) => (
  <EuiSplitPanel.Outer hasBorder hasShadow={false}>
    <EuiSplitPanel.Inner color="danger" grow={false} paddingSize="m">
      <EuiText size="s" color="danger">
        <strong>{label}</strong>
      </EuiText>
    </EuiSplitPanel.Inner>
    <EuiSplitPanel.Inner paddingSize="none">
      <EuiCodeBlock isCopyable paddingSize="m" lineNumbers css={codeblockStyles}>
        {data.message}
      </EuiCodeBlock>
    </EuiSplitPanel.Inner>
  </EuiSplitPanel.Outer>
);

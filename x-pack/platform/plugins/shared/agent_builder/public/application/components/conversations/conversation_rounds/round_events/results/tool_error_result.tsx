/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiSplitPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { ErrorResult } from '@kbn/agent-builder-common/tools/tool_result';

const label = i18n.translate('xpack.agentBuilder.roundEvents.results.error.title', {
  defaultMessage: 'Error',
});

interface ToolErrorResultProps {
  result: ErrorResult;
}

export const ToolErrorResult: React.FC<ToolErrorResultProps> = ({ result: { data } }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiSplitPanel.Outer hasBorder hasShadow={false}>
      <EuiSplitPanel.Inner color="danger" grow={false} paddingSize="m">
        <EuiText size="s" color="danger">
          <strong>{label}</strong>
        </EuiText>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner paddingSize="none">
        <EuiCodeBlock
          isCopyable
          paddingSize="m"
          css={css`
            word-break: break-word;
            background-color: ${euiTheme.colors.backgroundBaseSubdued};
          `}
        >
          {data.message}
        </EuiCodeBlock>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};

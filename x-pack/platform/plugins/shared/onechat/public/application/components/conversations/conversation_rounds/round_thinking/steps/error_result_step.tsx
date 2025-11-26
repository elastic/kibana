/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiSplitPanel, EuiText, useEuiTheme } from '@elastic/eui';
import type { ErrorResult } from '@kbn/onechat-common/tools/tool_result';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

const labels = {
  title: i18n.translate('xpack.onechat.round.thinking.steps.errorResultStep.title', {
    defaultMessage: 'Error',
  }),
};

interface ErrorResultStepProps {
  result: ErrorResult;
}
export const ErrorResultStep: React.FC<ErrorResultStepProps> = ({ result: { data } }) => {
  const { euiTheme } = useEuiTheme();
  // We add padding left to make tool result artifacts appear inline with the text of the progression step above it
  const paddingLeftStyles = css`
    padding-left: ${euiTheme.size.xl};
  `;
  return (
    <div css={paddingLeftStyles}>
      <EuiSplitPanel.Outer hasBorder hasShadow={false}>
        <EuiSplitPanel.Inner color="danger" grow={false} paddingSize="m">
          <EuiText size="s" color="danger">
            <strong>{labels.title}</strong>
          </EuiText>
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
      <EuiSplitPanel.Inner paddingSize="none">
        <EuiCodeBlock language="esql" isCopyable paddingSize="m" lineNumbers>
          {data.message}
        </EuiCodeBlock>
      </EuiSplitPanel.Inner>
    </div>
  );
};

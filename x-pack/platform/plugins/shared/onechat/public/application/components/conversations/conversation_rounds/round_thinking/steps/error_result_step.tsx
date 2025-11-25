/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiSplitPanel, EuiText } from '@elastic/eui';
import type { ErrorResult } from '@kbn/onechat-common/tools/tool_result';
import React from 'react';
import { i18n } from '@kbn/i18n';

const labels = {
  title: i18n.translate('xpack.onechat.round.thinking.steps.errorResultStep.title', {
    defaultMessage: 'Error',
  }),
};

interface ErrorResultStepProps {
  result: ErrorResult;
}
export const ErrorResultStep: React.FC<ErrorResultStepProps> = ({ result: { data } }) => (
  <EuiSplitPanel.Outer hasBorder hasShadow={false}>
    <EuiSplitPanel.Inner color="danger" grow={false} paddingSize="m">
      <EuiText size="s" color="danger">
        <strong>{labels.title}</strong>
      </EuiText>
    </EuiSplitPanel.Inner>
    <EuiSplitPanel.Inner paddingSize="none">
      <EuiCodeBlock language="esql" isCopyable paddingSize="m" lineNumbers>
        {data.message}
      </EuiCodeBlock>
    </EuiSplitPanel.Inner>
  </EuiSplitPanel.Outer>
);

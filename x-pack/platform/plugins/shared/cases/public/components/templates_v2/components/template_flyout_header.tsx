/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiStepsHorizontalProps } from '@elastic/eui';
import { EuiFlyoutHeader, EuiStepsHorizontal, EuiTitle, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from '../translations';

export interface TemplateFlyoutHeaderProps {
  steps: EuiStepsHorizontalProps['steps'];
}

export const TemplateFlyoutHeader = React.memo<TemplateFlyoutHeaderProps>(({ steps }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlyoutHeader data-test-subj="template-flyout-header" hasBorder>
      <EuiTitle size="m">
        <h2>{i18n.IMPORT_TEMPLATE}</h2>
      </EuiTitle>
      <EuiText
        css={css`
          margin-top: ${euiTheme.size.s};
          color: ${euiTheme.colors.textSubdued};
          font-size: ${euiTheme.size.m};
          font-weight: ${euiTheme.font.weight.regular};
          line-height: ${euiTheme.size.l};
        `}
      >
        <p>{i18n.IMPORT_TEMPLATE_DESCRIPTION}</p>
      </EuiText>
      <EuiStepsHorizontal
        steps={steps}
        size="s"
        css={css`
          margin-top: ${euiTheme.size.m};
        `}
        data-test-subj="template-flyout-steps"
      />
    </EuiFlyoutHeader>
  );
});

TemplateFlyoutHeader.displayName = 'TemplateFlyoutHeader';

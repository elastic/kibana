/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface StepFooterProps {
  onBack?: () => void;
  /** Forward actions (Next, Finish, ...), rendered on the right. */
  children: React.ReactNode;
}

/**
 * Back / forward actions pinned to the bottom of the viewport, so they stay in the same place
 * whatever the height of the step content. Render it as the last child of the step.
 */
export function StepFooter({ onBack, children }: StepFooterProps) {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      data-test-subj="onboardingStepFooter"
      css={css`
        position: sticky;
        bottom: 0;
        z-index: 1;
        margin-top: ${euiTheme.size.l};
        padding: ${euiTheme.size.base} 0;
        background-color: ${euiTheme.colors.backgroundBasePlain};
        border-top: ${euiTheme.border.thin};
      `}
    >
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          {onBack && (
            <EuiButtonEmpty
              iconType="chevronSingleLeft"
              iconSide="left"
              onClick={onBack}
              data-test-subj="onboardingStepFooter-backButton"
            >
              <FormattedMessage id="xpack.ingestHub.stepFooter.backButton" defaultMessage="Back" />
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{children}</EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}

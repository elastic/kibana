/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface StepFooterProps {
  onBack?: () => void;
  /** Forward actions (Next, Finish, ...), rendered on the right. */
  children: React.ReactNode;
}

/**
 * Back / forward actions that stay in the same place whatever the height of the step content.
 *
 * Render it as the last child of the step. The shell makes the step a column that fills the page,
 * so `margin-top: auto` pushes the footer down when the content is short, and `sticky` keeps it
 * at the bottom of the viewport when the content is taller than the screen.
 */
export function StepFooter({ onBack, children }: StepFooterProps) {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiSpacer size="l" />
      <div
        data-test-subj="onboardingStepFooter"
        css={css`
          position: sticky;
          bottom: 0;
          z-index: 1;
          margin-top: auto;
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
                <FormattedMessage
                  id="xpack.ingestHub.stepFooter.backButton"
                  defaultMessage="Back"
                />
              </EuiButtonEmpty>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{children}</EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </>
  );
}

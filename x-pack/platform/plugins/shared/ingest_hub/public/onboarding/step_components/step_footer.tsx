/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiBottomBar, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface StepFooterProps {
  onBack?: () => void;
  /** Forward actions (Next, Finish, ...), rendered on the right. */
  children: React.ReactNode;
}

/**
 * Back / forward actions in a bottom bar fixed to the bottom of the viewport, so they stay in the
 * same place whatever the height of the step content. Render it as the last child of the step.
 */
export function StepFooter({ onBack, children }: StepFooterProps) {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      {/* The bar is fixed, so it does not take any room in the page: keep the end of the step from
          being hidden behind it. */}
      <div
        aria-hidden
        css={css`
          height: ${euiTheme.size.xxxxl};
        `}
      />
      <EuiBottomBar paddingSize="s" data-test-subj="onboardingStepFooter">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            {onBack && (
              <EuiButtonEmpty
                color="text"
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
      </EuiBottomBar>
    </>
  );
}

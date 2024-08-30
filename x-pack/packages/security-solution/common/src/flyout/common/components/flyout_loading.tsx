/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/react';
import { FLYOUT_LOADING_TEST_ID } from '../test_ids';

export interface FlyoutLoadingProps {
  /**
  Data test subject string for testing
  */
  ['data-test-subj']?: string;
}

/**
 * Use this when you need to show a loading state in the flyout
 */
export const FlyoutLoading: React.FC<FlyoutLoadingProps> = ({
  'data-test-subj': dataTestSubj = FLYOUT_LOADING_TEST_ID,
}) => (
  <EuiFlexItem
    css={css`
      align-items: center;
      justify-content: center;
    `}
  >
    <EuiLoadingSpinner size="xxl" data-test-subj={dataTestSubj} />
  </EuiFlexItem>
);

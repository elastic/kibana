/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingChart, EuiLoadingSpinner } from '@elastic/eui';
import { AlertSummaryWidgetProps } from '..';

type Props = { isLoadingWithoutChart: boolean | undefined } & Pick<
  AlertSummaryWidgetProps,
  'fullSize'
>;

export const AlertSummaryWidgetLoader = ({ fullSize, isLoadingWithoutChart }: Props) => {
  return (
    <div
      style={{
        minHeight: isLoadingWithoutChart ? 44 : fullSize ? 238 : 224,
        display: 'flex',
        alignItems: 'center',
        justifyContent: isLoadingWithoutChart ? 'flex-start' : 'center',
      }}
    >
      {isLoadingWithoutChart ? (
        <EuiLoadingSpinner size="m" />
      ) : (
        <EuiLoadingChart size="l" data-test-subj="alertSummaryWidgetLoading" />
      )}
    </div>
  );
};

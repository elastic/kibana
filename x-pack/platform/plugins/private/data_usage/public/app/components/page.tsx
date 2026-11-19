/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { memo } from 'react';
import type { CommonProps } from '@elastic/eui';
import { EuiPageSection, EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';

export interface DataUsagePageProps {
  title: string;
  subtitle?: string;
  restrictWidth?: boolean | number;
  'data-test-subj'?: string;
}

export const DataUsagePage = memo<PropsWithChildren<DataUsagePageProps & CommonProps>>(
  ({
    title,
    subtitle,
    children,
    restrictWidth = false,
    'data-test-subj': dataTestSubj,
    ...otherProps
  }) => {
    return (
      <div {...otherProps} data-test-subj={dataTestSubj}>
        <AppHeader title={title} description={subtitle} spacing="bleed" />
        <EuiSpacer size="l" />
        <EuiPageSection paddingSize="none" color="transparent" restrictWidth={restrictWidth}>
          {children}
        </EuiPageSection>
      </div>
    );
  }
);

DataUsagePage.displayName = 'DataUsagePage';

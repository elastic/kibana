/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import React, { Children, Fragment, type ReactNode } from 'react';

interface SettingsPanelProps {
  title: ReactNode;
  children: ReactNode;
  'data-test-subj'?: string;
}

export const SettingsPanel = ({
  title,
  children,
  'data-test-subj': dataTestSubj,
}: SettingsPanelProps) => (
  <EuiPanel hasBorder paddingSize="l" data-test-subj={dataTestSubj}>
    <EuiTitle size="s">
      <h2>{title}</h2>
    </EuiTitle>
    <EuiSpacer size="m" />
    {Children.toArray(children).map((child, index) => (
      <Fragment key={index}>
        {index > 0 && <EuiHorizontalRule margin="m" />}
        {child}
      </Fragment>
    ))}
  </EuiPanel>
);

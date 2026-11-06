/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import { EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

/** A soft card that groups the fields that belong together, with a title that says what for. */
export const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) => (
  <EuiPanel color="subdued" hasShadow={false} borderRadius="m" paddingSize="m">
    <EuiTitle size="xxs">
      <h4>{title}</h4>
    </EuiTitle>
    {description && (
      <EuiText size="xs" color="subdued">
        <p>{description}</p>
      </EuiText>
    )}
    <EuiSpacer size="s" />
    {children}
  </EuiPanel>
);

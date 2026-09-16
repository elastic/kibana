/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';

interface FormSectionSummaryProps {
  title?: string;
  children: React.ReactNode;
  /** Optional content rendered above the title / body. */
  preamble?: React.ReactNode;
  'data-test-subj'?: string;
  textTestSubj?: string;
  /** Renders title and body on one line (title keeps xxs heading style). */
  inline?: boolean;
}

export const FormSectionSummary = ({
  title,
  children,
  preamble,
  'data-test-subj': dataTestSubj,
  textTestSubj,
  inline = false,
}: FormSectionSummaryProps) => (
  <EuiPanel color="subdued" paddingSize="m" hasBorder={false} data-test-subj={dataTestSubj}>
    {inline && title ? (
      <EuiText size="s" color="subdued" data-test-subj={textTestSubj}>
        <EuiTitle size="xxs">
          <span>{title}</span>
        </EuiTitle>{' '}
        {children}
      </EuiText>
    ) : (
      <>
        {preamble ? (
          <>
            <EuiText size="s" color="subdued">
              {preamble}
            </EuiText>
            {children ? <EuiSpacer size="s" /> : null}
          </>
        ) : null}
        {title ? (
          <>
            <EuiTitle size="xxs">
              <h4>{title}</h4>
            </EuiTitle>
            <EuiSpacer size="xs" />
          </>
        ) : null}
        {children ? (
          <EuiText size="s" color="subdued" data-test-subj={textTestSubj}>
            {children}
          </EuiText>
        ) : null}
      </>
    )}
  </EuiPanel>
);

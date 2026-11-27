/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export interface ClaimSectionProps {
  title: string;
  count?: number;
  children: React.ReactNode;
  'data-test-subj'?: string;
}

/** A titled section of the claim flyout. */
export const ClaimSection: React.FC<ClaimSectionProps> = ({
  title,
  count,
  children,
  'data-test-subj': dataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <section data-test-subj={dataTestSubj}>
      <EuiTitle size="xxs">
        <h3>
          {title}
          {count !== undefined ? (
            <EuiBadge
              color="hollow"
              css={css`
                margin-inline-start: ${euiTheme.size.s};
              `}
            >
              {count}
            </EuiBadge>
          ) : null}
        </h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      {children}
      <EuiSpacer size="l" />
    </section>
  );
};
ClaimSection.displayName = 'ClaimSection';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDescriptionListProps } from '@elastic/eui';
import { EuiDescriptionList, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

const sectionTitleStyle = css`
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

export const kiDetailSidebarBreakWordStyle = css`
  word-break: break-word;
  overflow-wrap: anywhere;
`;

const sidebarDescriptionListStyle = css`
  dt {
    margin-block-end: 4px;
  }

  dd {
    margin-block-end: 12px;
    ${kiDetailSidebarBreakWordStyle}
  }

  dd:last-of-type {
    margin-block-end: 0;
  }
`;

export const KiDetailSidebarSectionTitle = ({ children }: { children: React.ReactNode }) => (
  <EuiText size="xs" color="subdued">
    <p css={sectionTitleStyle}>{children}</p>
  </EuiText>
);

export const KiDetailSidebarDescriptionList = ({
  listItems,
  'data-test-subj': dataTestSubj,
}: Pick<EuiDescriptionListProps, 'listItems' | 'data-test-subj'>) => (
  <EuiDescriptionList
    type="stacked"
    compressed
    listItems={listItems}
    data-test-subj={dataTestSubj}
    css={sidebarDescriptionListStyle}
  />
);

export const KiDetailSidebarBreakableText = ({
  children,
  size = 's',
}: {
  children: React.ReactNode;
  size?: 's' | 'xs' | 'm';
}) => (
  <EuiText size={size} css={kiDetailSidebarBreakWordStyle}>
    {children}
  </EuiText>
);

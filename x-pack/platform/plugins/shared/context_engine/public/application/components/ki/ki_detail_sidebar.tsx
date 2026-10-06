/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDescriptionListProps } from '@elastic/eui';
import { EuiDescriptionList, EuiText, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

export const kiDetailSidebarBreakWordStyle = css`
  word-break: break-word;
  overflow-wrap: anywhere;
`;

export const KiDetailSidebarSectionTitle = ({ children }: { children: React.ReactNode }) => (
  <EuiTitle size="xxxs">
    <h3>{children}</h3>
  </EuiTitle>
);

interface KiDetailSidebarDescriptionListProps {
  listItems: EuiDescriptionListProps['listItems'];
  'data-test-subj'?: string;
}

export const KiDetailSidebarDescriptionList = ({
  listItems,
  'data-test-subj': dataTestSubj,
}: KiDetailSidebarDescriptionListProps) => (
  <EuiDescriptionList
    type="column"
    compressed
    listItems={listItems}
    data-test-subj={dataTestSubj}
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

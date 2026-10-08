/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export interface AttachmentInfoBarItem {
  title: string;
  content: React.ReactNode;
  'data-test-subj'?: string;
}

interface AttachmentInfoBarProps {
  items: AttachmentInfoBarItem[];
}

/** Bordered row of title/value cells separated by vertical dividers. */
export const AttachmentInfoBar: React.FC<AttachmentInfoBarProps> = ({ items }) => {
  const { euiTheme } = useEuiTheme();

  const itemCss = css`
    flex: 1;
    min-width: 0;
    padding: ${euiTheme.size.s} ${euiTheme.size.base};
    &:not(:first-of-type) {
      border-left: ${euiTheme.border.thin};
    }
  `;

  return (
    <EuiPanel paddingSize="none" hasShadow={false} hasBorder>
      <EuiFlexGroup gutterSize="none" responsive={false}>
        {items.map(({ title, content, 'data-test-subj': dataTestSubj }) => (
          <EuiFlexItem key={title} css={itemCss} data-test-subj={dataTestSubj}>
            <EuiFlexGroup
              direction="column"
              gutterSize="xs"
              alignItems="flexStart"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {title}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{content}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

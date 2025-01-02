/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, ReactNode } from 'react';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiSplitPanel, EuiTitle } from '@elastic/eui';

interface Props {
  title: string;
  content: {
    left: ReactNode;
    right: ReactNode;
  };
  footer?: {
    left?: ReactNode;
    right?: ReactNode;
  };
  'data-test-subj'?: string;
}

export const OverviewCard: FunctionComponent<Props> = ({
  title,
  content: { left: contentLeft, right: contentRight },
  footer: { left: footerLeft, right: footerRight } = {},
  'data-test-subj': dataTestSubj,
}) => {
  return (
    <EuiFlexItem>
      <EuiSplitPanel.Outer grow hasBorder={true} data-test-subj={dataTestSubj}>
        <EuiSplitPanel.Inner>
          <EuiTitle size="xxxs">
            <h4>{title}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup
            gutterSize="none"
            justifyContent="spaceBetween"
            wrap={true}
            alignItems="center"
            css={css`
              min-height: ${euiThemeVars.euiButtonHeightSmall};
            `}
          >
            <EuiFlexItem grow={false}>{contentLeft}</EuiFlexItem>
            <EuiFlexItem grow={false}>{contentRight}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner grow={false} color="subdued">
          <EuiFlexGroup
            gutterSize="none"
            justifyContent="spaceBetween"
            alignItems="center"
            wrap={true}
          >
            {footerLeft && <EuiFlexItem grow={false}>{footerLeft}</EuiFlexItem>}
            {footerRight && <EuiFlexItem grow={false}>{footerRight}</EuiFlexItem>}
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </EuiFlexItem>
  );
};

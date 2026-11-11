/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren, ReactNode } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';

export interface ExpandablePanelProps {
  header: {
    title: ReactNode;
    /** Makes the title a link, as in the Security flyout v2 previews that open a tool. */
    link?: {
      callback: () => void;
      tooltip: ReactNode;
    };
  };
  'data-test-subj': string;
}

/**
 * A preview panel with the look of the Security flyout v2 `ExpandablePanel`: a subdued header whose
 * title can open a tool, over the content. Cases cannot depend on Security Solution, so this keeps
 * only the parts the observable flyout uses.
 */
export const ExpandablePanel = ({
  header: { title, link },
  'data-test-subj': dataTestSubj,
  children,
}: PropsWithChildren<ExpandablePanelProps>) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiSplitPanel.Outer grow hasBorder data-test-subj={`${dataTestSubj}Panel`}>
      <EuiSplitPanel.Inner
        grow={false}
        color="subdued"
        paddingSize="none"
        // Lines the title up with the content below it, which has the `m` padding.
        css={css`
          padding: ${euiTheme.size.xs} ${euiTheme.size.m};
        `}
      >
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem
            grow={false}
            css={css`
              min-height: ${euiTheme.size.xl};
            `}
          >
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                {link ? (
                  <EuiToolTip content={link.tooltip}>
                    <EuiButtonEmpty
                      color="primary"
                      flush="both"
                      size="xs"
                      css={css`
                        font-weight: ${euiTheme.font.weight.bold};
                      `}
                      onClick={link.callback}
                      data-test-subj={`${dataTestSubj}TitleLink`}
                    >
                      {title}
                    </EuiButtonEmpty>
                  </EuiToolTip>
                ) : (
                  <EuiTitle size="xxxs">
                    <EuiText data-test-subj={`${dataTestSubj}TitleText`}>{title}</EuiText>
                  </EuiTitle>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      {children != null && (
        <EuiSplitPanel.Inner paddingSize="none">
          <EuiPanel
            hasBorder={false}
            borderRadius="none"
            paddingSize="m"
            data-test-subj={`${dataTestSubj}Content`}
          >
            {children}
          </EuiPanel>
        </EuiSplitPanel.Inner>
      )}
    </EuiSplitPanel.Outer>
  );
};

ExpandablePanel.displayName = 'ExpandablePanel';

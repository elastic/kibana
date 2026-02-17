/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiTabs, EuiTab, EuiSpacer } from '@elastic/eui';
import type { Props as EuiTabProps } from '@elastic/eui/src/components/tabs/tab';
import type { EuiFlexItemProps } from '@elastic/eui/src/components/flex/flex_item';

const Container = styled.div`
  border-bottom: ${(props) => props.theme.eui.euiBorderThin};

  @media (max-width: 767px) {
    .euiFlexItem {
      margin-bottom: 0 !important;
    }
  }

  // should be alice blue
  background-color: ${(props) => props.theme.eui.euiColorBackgroundBaseSubdued};
`;

const Wrapper = styled.div<{ maxWidth?: number | string }>`
  max-width: ${(props) =>
    typeof props.maxWidth === 'number'
      ? `${props.maxWidth || 1200}px` || props.maxWidth
      : props.maxWidth};

  margin-left: auto;
  margin-right: auto;
  padding-top: ${(props) => props.theme.eui.euiSizeXL};
  padding-left: ${(props) => props.theme.eui.euiSizeM};
  padding-right: ${(props) => props.theme.eui.euiSizeM};
`;

const Tabs = styled(EuiTabs)<{ $tabsCss?: string }>`
  top: 1px;
  &:before {
    height: 0px;
  }
  ${({ $tabsCss }) => $tabsCss || ''}
`;

export interface HeaderProps {
  maxWidth?: number | string;
  leftColumn?: JSX.Element;
  rightColumn?: JSX.Element;
  rightColumnGrow?: EuiFlexItemProps['grow'];
  topContent?: JSX.Element;
  tabs?: Array<Omit<EuiTabProps, 'name'> & { name?: JSX.Element | string }>;
  tabsCss?: string;
  'data-test-subj'?: string;
}

const HeaderColumns: React.FC<Omit<HeaderProps, 'tabs'>> = memo(
  ({ leftColumn, rightColumn, rightColumnGrow }) => (
    <EuiFlexGroup alignItems="center">
      {leftColumn ? <EuiFlexItem>{leftColumn}</EuiFlexItem> : null}
      {rightColumn ? <EuiFlexItem grow={rightColumnGrow}>{rightColumn}</EuiFlexItem> : null}
    </EuiFlexGroup>
  )
);

export const Header: React.FC<HeaderProps> = ({
  leftColumn,
  rightColumn,
  rightColumnGrow,
  topContent,
  tabs,
  maxWidth,
  tabsCss,
  'data-test-subj': dataTestSubj,
}) => (
  <Container data-test-subj={dataTestSubj}>
    <Wrapper maxWidth={maxWidth}>
      {topContent}
      <HeaderColumns
        leftColumn={leftColumn}
        rightColumn={rightColumn}
        rightColumnGrow={rightColumnGrow}
      />
      <EuiFlexGroup>
        {tabs ? (
          <EuiFlexItem>
            <Tabs $tabsCss={tabsCss}>
              {tabs.map((props, index) => (
                <EuiTab {...(props as EuiTabProps)} key={`${props.id}-${index}`}>
                  {props.name}
                </EuiTab>
              ))}
            </Tabs>
          </EuiFlexItem>
        ) : (
          <EuiFlexItem>
            <EuiSpacer size="l" />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </Wrapper>
  </Container>
);

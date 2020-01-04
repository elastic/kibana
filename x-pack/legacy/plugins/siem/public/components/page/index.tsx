/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiBadge,
  EuiBadgeProps,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiIcon,
  EuiPage,
} from '@elastic/eui';
import styled, { createGlobalStyle } from 'styled-components';

/*
  SIDE EFFECT: the following `createGlobalStyle` overrides default styling in angular code that was not theme-friendly
  and `EuiPopover`, `EuiToolTip` global styles
*/
export const AppGlobalStyle = createGlobalStyle`
  div.app-wrapper {
    background-color: rgba(0,0,0,0);
  }

  div.application {
    background-color: rgba(0,0,0,0);
  }

  .euiPopover__panel.euiPopover__panel-isOpen {
    z-index: 9900 !important;
  }
  .euiToolTip {
    z-index: 9950 !important;
  }

  /* 
    overrides the default styling of euiComboBoxOptionsList because it's implemented
    as a popover, so it's not selectable as a child of the styled component
  */
  .euiComboBoxOptionsList {
    z-index: 9999;
  }

  /* overrides default styling in angular code that was not theme-friendly */
  .euiPanel-loading-hide-border {
    border: none;
  }
`;

export const DescriptionListStyled = styled(EuiDescriptionList)`
  ${({ theme }) => `
    dt {
      font-size: ${theme.eui.euiFontSizeXS} !important;
    }
    dd {
      width: fit-content;
    }
    dd > div {
      width: fit-content;
    }
  `}
`;

DescriptionListStyled.displayName = 'DescriptionListStyled';

export const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
  height: 100%;
  padding: 1rem;
  overflow: hidden;
  margin: 0;
`;

PageContainer.displayName = 'PageContainer';

export const PageContent = styled.div`
  flex: 1 1 auto;
  height: 100%;
  position: relative;
  overflow-y: hidden;
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
  margin-top: 62px;
`;

PageContent.displayName = 'PageContent';

export const FlexPage = styled(EuiPage)`
  flex: 1 0 0;
`;

FlexPage.displayName = 'FlexPage';

export const PageHeader = styled.div`
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
  display: flex;
  user-select: none;
  padding: 1rem 1rem 0 1rem;
  width: 100vw;
  position: fixed;
`;

PageHeader.displayName = 'PageHeader';

export const FooterContainer = styled.div`
  bottom: 0;
  color: #666;
  left: 0;
  position: fixed;
  text-align: left;
  user-select: none;
  width: 100%;
  background-color: #f5f7fa;
  padding: 16px;
  border-top: 1px solid #d3dae6;
`;

FooterContainer.displayName = 'FooterContainer';

export const PaneScrollContainer = styled.div`
  height: 100%;
  overflow-y: scroll;
  > div:last-child {
    margin-bottom: 3rem;
  }
`;

PaneScrollContainer.displayName = 'PaneScrollContainer';

export const Pane = styled.div`
  height: 100%;
  overflow: hidden;
  user-select: none;
`;

Pane.displayName = 'Pane';

export const PaneHeader = styled.div`
  display: flex;
`;

PaneHeader.displayName = 'PaneHeader';

export const Pane1FlexContent = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  height: 100%;
`;

Pane1FlexContent.displayName = 'Pane1FlexContent';

// Ref: https://github.com/elastic/eui/issues/1655
// const Badge = styled(EuiBadge)`
//   margin-left: 5px;
// `;
export const CountBadge = (props: EuiBadgeProps) => (
  <EuiBadge {...props} style={{ marginLeft: '5px' }} />
);

CountBadge.displayName = 'CountBadge';

export const Spacer = styled.span`
  margin-left: 5px;
`;

Spacer.displayName = 'Spacer';

// Ref: https://github.com/elastic/eui/issues/1655
// export const Badge = styled(EuiBadge)`
//   vertical-align: top;
// `;
export const Badge = (props: EuiBadgeProps) => (
  <EuiBadge {...props} style={{ verticalAlign: 'top' }} />
);

Badge.displayName = 'Badge';

export const MoreRowItems = styled(EuiIcon)`
  margin-left: 5px;
`;

MoreRowItems.displayName = 'MoreRowItems';

export const OverviewWrapper = styled(EuiFlexGroup)`
  position: relative;

  .euiButtonIcon {
    position: absolute;
    right: ${props => props.theme.eui.euiSizeM};
    top: 6px;
    z-index: 2;
  }
`;

OverviewWrapper.displayName = 'OverviewWrapper';

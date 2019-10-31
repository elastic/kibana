/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink } from '@elastic/eui';
import React from 'react';
import styled, { css } from 'styled-components';

import { navTabs } from '../../pages/home/home_navigations';
import { getOverviewUrl } from '../link_to';
import { MlPopover } from '../ml_popover/ml_popover';
import { SiemNavigation } from '../navigation';
import * as i18n from './translations';

interface HeaderProps {
  offsetRight?: string;
}

const Header = styled.header.attrs({
  className: 'siemHeaderGlobal',
})<HeaderProps>`
  ${({ offsetRight, theme }) => css`
    background: ${theme.eui.euiColorEmptyShade};
    border-bottom: ${theme.eui.euiBorderThin};
    margin: 0 -${offsetRight ? offsetRight : theme.eui.euiSizeL} 0 -${theme.eui.euiSizeL};
    padding: ${theme.eui.paddingSizes.m} ${offsetRight ? offsetRight : theme.eui.paddingSizes.l}
      ${theme.eui.paddingSizes.m} ${theme.eui.paddingSizes.l};
  `}
`;
Header.displayName = 'Header';

const FlexItem = styled(EuiFlexItem)`
  min-width: 0;
`;
FlexItem.displayName = 'FlexItem';

export const HeaderGlobal = React.memo<HeaderProps>(({ offsetRight }) => (
  <Header offsetRight={offsetRight}>
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap>
      <FlexItem>
        <EuiFlexGroup alignItems="center" responsive={false}>
          <FlexItem grow={false}>
            <EuiLink href={getOverviewUrl()}>
              <EuiIcon aria-label={i18n.SIEM} type="securityAnalyticsApp" size="l" />
            </EuiLink>
          </FlexItem>

          <FlexItem component="nav">
            <SiemNavigation display="condensed" navTabs={navTabs} />
          </FlexItem>
        </EuiFlexGroup>
      </FlexItem>

      <FlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
          <FlexItem grow={false}>
            <MlPopover />
          </FlexItem>

          <FlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="add-data"
              href="kibana#home/tutorial_directory/siem"
              iconType="plusInCircle"
            >
              {i18n.BUTTON_ADD_DATA}
            </EuiButtonEmpty>
          </FlexItem>
        </EuiFlexGroup>
      </FlexItem>
    </EuiFlexGroup>
  </Header>
));
HeaderGlobal.displayName = 'HeaderGlobal';

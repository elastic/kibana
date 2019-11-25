/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink } from '@elastic/eui';
import { pickBy } from 'lodash/fp';
import React from 'react';
import styled, { css } from 'styled-components';

import { gutterTimeline } from '../../lib/helpers';
import { navTabs } from '../../pages/home/home_navigations';
import { SiemPageName } from '../../pages/home/types';
import { getOverviewUrl } from '../link_to';
import { MlPopover } from '../ml_popover/ml_popover';
import { SiemNavigation } from '../navigation';
import * as i18n from './translations';

const Wrapper = styled.header`
  ${({ theme }) => css`
    background: ${theme.eui.euiColorEmptyShade};
    border-bottom: ${theme.eui.euiBorderThin};
    padding: ${theme.eui.paddingSizes.m} ${gutterTimeline} ${theme.eui.paddingSizes.m}
      ${theme.eui.paddingSizes.l};
  `}
`;
Wrapper.displayName = 'Wrapper';

const FlexItem = styled(EuiFlexItem)`
  min-width: 0;
`;
FlexItem.displayName = 'FlexItem';

interface HeaderGlobalProps {
  hideDetectionEngine?: boolean;
}
export const HeaderGlobal = React.memo<HeaderGlobalProps>(({ hideDetectionEngine = false }) => (
  <Wrapper className="siemHeaderGlobal">
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap>
      <FlexItem>
        <EuiFlexGroup alignItems="center" responsive={false}>
          <FlexItem grow={false}>
            <EuiLink href={getOverviewUrl()}>
              <EuiIcon aria-label={i18n.SIEM} type="securityAnalyticsApp" size="l" />
            </EuiLink>
          </FlexItem>

          <FlexItem component="nav">
            <SiemNavigation
              display="condensed"
              navTabs={
                hideDetectionEngine
                  ? pickBy((value, key) => key !== SiemPageName.detectionEngine, navTabs)
                  : navTabs
              }
            />
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
  </Wrapper>
));
HeaderGlobal.displayName = 'HeaderGlobal';

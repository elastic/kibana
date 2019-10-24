/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHideFor, EuiPageSideBar, EuiShowFor, EuiSideNav } from '@elastic/eui';
import React, { useState, useCallback } from 'react';
import euiStyled from '../../../../../../common/eui_styled_components';
import { NavItem } from '../lib/side_nav_context';

interface Props {
  loading: boolean;
  name: string;
  items: NavItem[];
}

export const MetricsSideNav = ({ loading, name, items }: Props) => {
  const [isOpenOnMobile, setMobileState] = useState(false);

  const toggle = useCallback(() => {
    setMobileState(!isOpenOnMobile);
  }, [isOpenOnMobile]);

  const content = loading ? null : <EuiSideNav items={items} />;
  const mobileContent = loading ? null : (
    <EuiSideNav
      items={items}
      mobileTitle={name}
      toggleOpenOnMobile={toggle}
      isOpenOnMobile={isOpenOnMobile}
    />
  );
  return (
    <EuiPageSideBar>
      <EuiHideFor sizes={['xs', 's']}>
        <SideNavContainer>{content}</SideNavContainer>
      </EuiHideFor>
      <EuiShowFor sizes={['xs', 's']}>{mobileContent}</EuiShowFor>
    </EuiPageSideBar>
  );
};

const SideNavContainer = euiStyled.div`
  position: fixed;
  z-index: 1;
  height: 88vh;
  padding-left: 16px;
  margin-left: -16px;
  overflow-y: auto;
  overflow-x: hidden;
`;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiFlexGroup, EuiHorizontalRule, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useRouteAccessConfig } from '../../../../hooks/use_route_access_config';
import { getManageNavItems } from '../../../../route_config';
import { SidebarNavList } from '../shared/sidebar_nav_list';

interface ManageSidebarViewProps {
  pathname: string;
}

export const ManageSidebarView: React.FC<ManageSidebarViewProps> = ({ pathname }) => {
  const routeAccessConfig = useRouteAccessConfig();
  const { euiTheme } = useEuiTheme();

  const navItems = useMemo(() => getManageNavItems(routeAccessConfig), [routeAccessConfig]);

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <EuiFlexGroup direction="column" gutterSize="none" data-test-subj="agentBuilderSidebar-manage">
      <EuiHorizontalRule margin="none" />
      <EuiFlexGroup
        direction="column"
        css={css`
          padding: ${euiTheme.size.base};
        `}
      >
        <SidebarNavList items={navItems} isActive={isActive} />
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};

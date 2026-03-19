/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiFlexGroup, EuiHorizontalRule, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { AGENT_BUILDER_CONNECTORS_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { useExperimentalFeatures } from '../../../../hooks/use_experimental_features';
import { useKibana } from '../../../../hooks/use_kibana';
import { getManageNavItems } from '../../../../route_config';
import { SidebarNavList } from '../shared/sidebar_nav_list';

interface ManageSidebarViewProps {
  pathname: string;
}

export const ManageSidebarView: React.FC<ManageSidebarViewProps> = ({ pathname }) => {
  const isExperimentalFeaturesEnabled = useExperimentalFeatures();
  const { euiTheme } = useEuiTheme();
  const {
    services: { uiSettings },
  } = useKibana();
  const isConnectorsEnabled = uiSettings.get<boolean>(
    AGENT_BUILDER_CONNECTORS_ENABLED_SETTING_ID,
    false
  );

  const navItems = useMemo(() => {
    return getManageNavItems().filter((item) => {
      if (item.isExperimental && !isExperimentalFeaturesEnabled) {
        return false;
      }
      if (item.isConnectors && !isConnectorsEnabled) {
        return false;
      }
      return true;
    });
  }, [isExperimentalFeaturesEnabled, isConnectorsEnabled]);

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
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

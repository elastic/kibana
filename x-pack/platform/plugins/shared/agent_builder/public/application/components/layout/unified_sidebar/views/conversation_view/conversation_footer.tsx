/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { getEbtProps } from '@kbn/ebt-click';
import { AGENT_BUILDER_UI_EBT, AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common';
import { appPaths } from '../../../../../utils/app_paths';
import { useNavigation } from '../../../../../hooks/use_navigation';
import { useKibana } from '../../../../../hooks/use_kibana';
import { SidebarLink } from './sidebar_link';

export const ConversationFooter: React.FC = () => {
  const { navigateToAgentBuilderUrl } = useNavigation();
  const {
    services: { analytics },
  } = useKibana();

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      css={css`
        flex-grow: 0;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SidebarLink
          label={i18n.translate('xpack.agentBuilder.sidebar.conversation.manageComponents', {
            defaultMessage: 'Manage components',
          })}
          href={appPaths.manage.agents}
          hideIcon={true}
          onClick={(e) => {
            e.preventDefault();
            analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.SidebarLayerTransition, {
              from_layer: 'conversation',
              to_layer: 'manage',
              trigger: 'manage_click',
            });
            navigateToAgentBuilderUrl(appPaths.manage.agents);
          }}
          {...getEbtProps({
            element: AGENT_BUILDER_UI_EBT.element.SIDEBAR,
            action: AGENT_BUILDER_UI_EBT.action.navSidebar.SIDEBAR_LAYER_TRANSITION,
            detail: AGENT_BUILDER_UI_EBT.detail.layerTransition.MANAGE_CLICK,
          })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

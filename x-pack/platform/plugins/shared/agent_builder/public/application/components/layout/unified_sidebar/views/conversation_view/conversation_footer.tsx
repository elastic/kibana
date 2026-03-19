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

import { appPaths } from '../../../../../utils/app_paths';
import { useNavigation } from '../../../../../hooks/use_navigation';
import { SidebarLink } from './sidebar_link';

export const FOOTER_HEIGHT = 64;

const footerStyles = css`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
`;

export const ConversationFooter: React.FC = () => {
  const { navigateToAgentBuilderUrl } = useNavigation();

  return (
    <EuiFlexGroup direction="column" gutterSize="none" css={footerStyles}>
      <EuiFlexItem grow={false}>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
      <EuiFlexItem grow>
        <SidebarLink
          label={i18n.translate('xpack.agentBuilder.sidebar.conversation.manageComponents', {
            defaultMessage: 'Manage components',
          })}
          href={appPaths.manage.agents}
          onClick={(e) => {
            e.preventDefault();
            navigateToAgentBuilderUrl(appPaths.manage.agents);
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

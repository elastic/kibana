/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
import { KbnInfoCallout } from '@kbn/ui-callout';

import { ApplicationConnectionsTable } from './application_connections_table';
import { labels } from '../constants/i18n';
import { useNavigation } from '../hooks/use_navigation';

const pageBodyStyles = css`
  flex-grow: 0;
`;

export const ApplicationConnections = () => {
  const { mcpClientsListUrl, navigateToMcpClientsList } = useNavigation();

  const menu: AppHeaderMenu = {
    primaryActionItem: {
      id: 'manageMcpClients',
      label: labels.page.manageClientsLink,
      iconType: 'gear',
      testId: 'applicationConnectionsManageClientsLink',
      href: mcpClientsListUrl,
      run: navigateToMcpClientsList,
    },
  };

  return (
    <>
      <AppHeader title={labels.page.title} menu={menu} spacing="bleed" />
      <EuiSpacer size="l" />
      <div css={pageBodyStyles}>
        <KbnInfoCallout size="s" title={labels.page.pageCallout} />
        <EuiSpacer size="m" />
        <ApplicationConnectionsTable />
      </div>
    </>
  );
};

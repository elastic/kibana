/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { css } from '@emotion/react';
import { MANAGEMENT_APP_ID } from '@kbn/management-plugin/public';
import { McpClientsTable } from './mcp_clients_table';
import { labels } from '../../utils/i18n';
import { useMcpClientsActions } from '../../context/mcp_clients_provider';
import { useKibana } from '../../hooks/use_kibana';
import type { LocationState } from '../../hooks/use_navigation';

const headerStyles = ({ euiTheme }: UseEuiTheme) => css`
  background-color: ${euiTheme.colors.backgroundBasePlain};
  border-style: none;
`;

export const AgentBuilderMcpClients = () => {
  const { createMcpClient, viewClientDetails } = useMcpClientsActions();
  const {
    services: { application },
  } = useKibana();
  const location = useLocation<LocationState>();
  const history = useHistory<LocationState>();

  const applicationConnectionsUrl = useMemo(
    () => application.getUrlForApp(MANAGEMENT_APP_ID, { deepLinkId: 'application_connections' }),
    [application]
  );

  // Consumes the value once and immediately strips it from `window.history.state`
  // so the secret does not linger in the browser's history
  useEffect(() => {
    const createdClient = location.state?.mcpClientCreated;
    if (!createdClient) return;

    viewClientDetails(createdClient, 'modal');

    const { mcpClientCreated, ...remainingState } = location.state;
    const hasOtherState = Object.keys(remainingState).length > 0;
    history.replace({ ...location, state: hasOtherState ? remainingState : undefined });
  }, [location, history, viewClientDetails]);

  return (
    <KibanaPageTemplate data-test-subj="agentBuilderMcpClientsListPage">
      <KibanaPageTemplate.Header
        css={headerStyles}
        pageTitle={labels.tools.mcpClients.title}
        description={labels.tools.mcpClients.description}
        rightSideItems={[
          <EuiButton fill onClick={createMcpClient} data-test-subj="mcpClientsAddButton">
            {labels.tools.mcpClients.addMcpClientButtonLabel}
          </EuiButton>,
          <EuiButtonEmpty
            href={applicationConnectionsUrl}
            data-test-subj="mcpClientsManageApplicationConnectionsButton"
          >
            {labels.tools.mcpClients.manageApplicationConnectionsButtonLabel}
          </EuiButtonEmpty>,
        ]}
      />
      <KibanaPageTemplate.Section>
        <McpClientsTable />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};

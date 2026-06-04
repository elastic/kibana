/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiLink, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { ApplicationConnectionsTable } from './application_connections_table';
import { labels } from '../constants/i18n';
import { useNavigation } from '../hooks/use_navigation';

const headerStyles = ({ euiTheme }: UseEuiTheme) => css`
  background-color: ${euiTheme.colors.backgroundBasePlain};
  border-style: none;
`;

export const ApplicationConnections = () => {
  const { mcpClientsListUrl } = useNavigation();

  return (
    <>
      <KibanaPageTemplate.Header
        css={headerStyles}
        pageTitle={labels.page.title}
        description={
          <FormattedMessage
            id="xpack.security.management.applicationConnections.subtitle"
            defaultMessage="Manage connections for OAuth-based applications. Currently, only MCP clients are supported. {manageClientsLink}"
            values={{
              manageClientsLink: (
                <EuiLink
                  href={mcpClientsListUrl}
                  data-test-subj="applicationConnectionsManageClientsLink"
                >
                  {labels.page.manageClientsLink}
                </EuiLink>
              ),
            }}
          />
        }
      />
      <KibanaPageTemplate.Section paddingSize="none">
        <EuiSpacer size="l" />
        <ApplicationConnectionsTable />
      </KibanaPageTemplate.Section>
    </>
  );
};

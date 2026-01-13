/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageHeader, EuiSpacer, EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useConnectorNavigation } from '../hooks/use_connector_navigation';
import { useConnectors } from '../hooks/use_connectors';
import { useActiveSources } from '../hooks/use_active_sources';

interface DataConnectorsLayoutProps {
  children: React.ReactNode;
}

export const DataConnectorsLayout: React.FC<DataConnectorsLayoutProps> = ({ children }) => {
  const { navigateToConnectors, navigateToActiveSources, isConnectorsTab, isActiveSourcesTab } =
    useConnectorNavigation();
  const { connectors } = useConnectors();
  const { activeSources } = useActiveSources();

  const tabs = [
    {
      label: (
        <>
          {i18n.translate('xpack.dataConnectors.tabs.activeSources', {
            defaultMessage: 'Active sources',
          })}{' '}
          <EuiBadge color="hollow">{activeSources.length}</EuiBadge>
        </>
      ),
      onClick: navigateToActiveSources,
      isSelected: isActiveSourcesTab,
      key: 'active-sources',
      'data-test-subj': 'activeSourcesTab',
    },
    {
      label: (
        <>
          {i18n.translate('xpack.dataConnectors.tabs.catalog', {
            defaultMessage: 'Catalog',
          })}{' '}
          <EuiBadge color="hollow">{connectors.length}</EuiBadge>
        </>
      ),
      onClick: navigateToConnectors,
      isSelected: isConnectorsTab,
      key: 'connectors',
      'data-test-subj': 'connectorsTab',
    },
  ];

  return (
    <KibanaPageTemplate data-test-subj="dataConnectorsPage">
      <KibanaPageTemplate.Section restrictWidth={true} paddingSize="l">
        <EuiPageHeader
          bottomBorder
          paddingSize="none"
          pageTitle={i18n.translate('xpack.dataConnectors.pageTitle', {
            defaultMessage: 'Sources',
          })}
          description={i18n.translate('xpack.dataConnectors.pageDescription', {
            defaultMessage: 'Connect your data to power your agents and indices.',
          })}
          tabs={tabs}
        />

        <EuiSpacer size="l" />

        {children}
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};

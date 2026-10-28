/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { CloudConnectorTabs, type CloudConnectorTab } from './cloud_connector_tabs';
import { TABS } from './constants';

describe('CloudConnectorTabs', () => {
  const tabs: CloudConnectorTab[] = [
    { id: TABS.NEW_CONNECTION, name: 'New Identity', content: <div>{'new content'}</div> },
    {
      id: TABS.EXISTING_CONNECTION,
      name: 'Existing Identity',
      content: <div>{'existing content'}</div>,
    },
  ];

  const renderTabs = (props: {
    hasAttachedCloudConnector: boolean;
    cloudConnectorsCount: number;
  }) =>
    render(
      <I18nProvider>
        <CloudConnectorTabs
          tabs={tabs}
          selectedTabId={TABS.NEW_CONNECTION}
          onTabClick={jest.fn()}
          {...props}
        />
      </I18nProvider>
    );

  it('disables "New Identity" and keeps "Existing Identity" enabled when a connector is attached, even with no connectors listed', () => {
    renderTabs({ hasAttachedCloudConnector: true, cloudConnectorsCount: 0 });

    expect(screen.getByRole('tab', { name: 'New Identity' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Existing Identity' })).toBeEnabled();
  });

  it('keeps "New Identity" enabled and disables "Existing Identity" when nothing is attached and no connectors exist', () => {
    renderTabs({ hasAttachedCloudConnector: false, cloudConnectorsCount: 0 });

    expect(screen.getByRole('tab', { name: 'New Identity' })).toBeEnabled();
    expect(screen.getByRole('tab', { name: 'Existing Identity' })).toBeDisabled();
  });

  it('keeps both tabs enabled when nothing is attached and connectors exist', () => {
    renderTabs({ hasAttachedCloudConnector: false, cloudConnectorsCount: 2 });

    expect(screen.getByRole('tab', { name: 'New Identity' })).toBeEnabled();
    expect(screen.getByRole('tab', { name: 'Existing Identity' })).toBeEnabled();
  });
});

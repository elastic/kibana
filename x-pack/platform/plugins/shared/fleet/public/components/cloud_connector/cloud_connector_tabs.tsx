/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTab, EuiTabs, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { CloudProvider } from '../../types';

import { TABS } from './constants';

export interface CloudConnectorTab {
  id: 'new-connection' | 'existing-connection';
  name: string | React.ReactNode;
  content: React.ReactNode;
}

export interface CloudConnectorTabsProps {
  tabs: CloudConnectorTab[];
  selectedTabId: string;
  onTabClick: (tab: CloudConnectorTab) => void;
  isEditPage: boolean;
  cloudProvider?: CloudProvider;
  cloudConnectorsCount: number;
}

export const CloudConnectorTabs: React.FC<CloudConnectorTabsProps> = ({
  tabs,
  selectedTabId,
  onTabClick,
  cloudConnectorsCount,
  isEditPage,
}) => {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiTabs>
        {tabs.map((tab) => (
          <EuiTab
            key={tab.id}
            onClick={() => {
              onTabClick(tab);
            }}
            isSelected={tab.id === selectedTabId}
            disabled={
              (tab.id === TABS.EXISTING_CONNECTION && !cloudConnectorsCount) ||
              (isEditPage && tab.id === TABS.NEW_CONNECTION)
            }
          >
            <FormattedMessage
              id="xpack.fleet.cloudConnector.tabs.tabName"
              defaultMessage="{name}"
              values={{
                name: tab.name,
              }}
            />
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="m" />
      {tabs.find((tab) => tab.id === selectedTabId)?.content}
    </>
  );
};

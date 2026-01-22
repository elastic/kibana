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
  /** Optional flag to explicitly disable this tab */
  disabled?: boolean;
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
        {tabs.map((tab) => {
          // Tab is disabled if:
          // 1. Tab's own disabled property is true
          // 2. It's the existing connection tab with no connectors available
          // 3. It's the new connection tab on edit page
          const isDisabled =
            tab.disabled ||
            (tab.id === TABS.EXISTING_CONNECTION && !cloudConnectorsCount) ||
            (isEditPage && tab.id === TABS.NEW_CONNECTION);

          return (
            <EuiTab
              key={tab.id}
              onClick={() => {
                onTabClick(tab);
              }}
              isSelected={tab.id === selectedTabId}
              disabled={isDisabled}
            >
              <FormattedMessage
                id="securitySolutionPackages.cloudSecurityPosture.cloudConnectorSetup.cloudConnectorTabs.tab"
                defaultMessage="{name}"
                values={{
                  name: tab.name,
                }}
              />
            </EuiTab>
          );
        })}
      </EuiTabs>
      <EuiSpacer size="m" />
      {tabs.find((tab) => tab.id === selectedTabId)?.content}
    </>
  );
};

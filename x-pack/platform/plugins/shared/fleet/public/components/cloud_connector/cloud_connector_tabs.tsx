/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiRadio, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';

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
  const radioIdPrefix = useGeneratedHtmlId({ prefix: 'cloudConnectorIdentity' });

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup
        gutterSize="xl"
        alignItems="center"
        responsive={false}
        wrap
        role="radiogroup"
        data-test-subj="cloudConnectorIdentityToggle"
      >
        {tabs.map((tab) => (
          <EuiFlexItem grow={false} key={tab.id}>
            <EuiRadio
              id={`${radioIdPrefix}-${tab.id}`}
              name={radioIdPrefix}
              label={tab.name}
              checked={tab.id === selectedTabId}
              disabled={
                (tab.id === TABS.EXISTING_CONNECTION && !cloudConnectorsCount && !isEditPage) ||
                (isEditPage && tab.id === TABS.NEW_CONNECTION)
              }
              onChange={() => onTabClick(tab)}
              data-test-subj={`cloudConnectorIdentity-${tab.id}`}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {tabs.find((tab) => tab.id === selectedTabId)?.content}
    </>
  );
};

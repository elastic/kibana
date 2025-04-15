/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiPanel, EuiTab, EuiTabs } from '@elastic/eui';
import { css } from '@emotion/css';
import React, { useState, ReactNode } from 'react';

interface Tab {
  id: string;
  name: string;
  content: ReactNode;
}

interface TabsPanelProps {
  tabs: Tab[];
}

export function TabsPanel({ tabs }: TabsPanelProps) {
  const [selectedTab, setSelectedTab] = useState<string | undefined>(undefined);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        className={css`
          height: 100%;
        `}
      >
        {tabs.length === 1 ? (
          tabs[0].content
        ) : (
          <>
            <EuiTabs>
              {tabs.map((tab, index) => (
                <EuiTab
                  isSelected={(!selectedTab && index === 0) || selectedTab === tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  key={tab.id}
                >
                  {tab.name}
                </EuiTab>
              ))}
            </EuiTabs>
            {
              tabs.find((tab, index) => (!selectedTab && index === 0) || selectedTab === tab.id)
                ?.content
            }
          </>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
}

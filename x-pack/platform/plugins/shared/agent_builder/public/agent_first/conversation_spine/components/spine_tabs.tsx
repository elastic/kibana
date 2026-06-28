/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTab, EuiTabs, useEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import React, { useCallback } from 'react';
import type { AttachmentsService } from '../../../services/attachments/attachements_service';
import { useConversationSpineContext } from '../conversation_spine_context';
import { BASE_SPINE_TABS, getAllTabsForSpineType } from '../spine_type_config';
import type { SpineTabDefinition, SpineTabId } from '../types';
import { AttachmentsTab } from './attachments_tab';
import { PeopleTab } from './people_tab';
import { SpinePlaceholderTab } from './spine_placeholder_tab';

const tabPromotionEntrance = keyframes`
  from {
    opacity: 0;
    transform: translateX(8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

interface SpineTabsProps {
  attachmentsService: AttachmentsService;
  additionalTabs?: SpineTabDefinition[];
}

export const SpineTabs: React.FC<SpineTabsProps> = ({ attachmentsService, additionalTabs }) => {
  const { euiTheme } = useEuiTheme();
  const { spineState, setActiveTab } = useConversationSpineContext();

  const onTabClick = useCallback(
    (tabId: SpineTabId) => {
      setActiveTab(tabId);
    },
    [setActiveTab]
  );

  if (!spineState) {
    return null;
  }

  const { activeTabId, attachmentsView, record } = spineState;
  const configuredTabs = getAllTabsForSpineType(record.type);
  const typeSpecificTabs = configuredTabs.filter(
    (tab) => !BASE_SPINE_TABS.some((baseTab) => baseTab.id === tab.id)
  );

  const typeSpecificTabStyles = css`
    animation: ${tabPromotionEntrance} 200ms ease-out;
  `;

  const renderTabContent = () => {
    if (activeTabId === 'attachments') {
      return (
        <AttachmentsTab attachmentsService={attachmentsService} attachmentsView={attachmentsView} />
      );
    }

    if (activeTabId === 'people') {
      return <PeopleTab />;
    }

    const typeTab = configuredTabs.find((tab) => tab.id === activeTabId);
    if (typeTab) {
      return (
        <SpinePlaceholderTab
          title={typeTab.name}
          testSubj={`agentBuilderConversationSpineTabContent-${activeTabId}`}
        />
      );
    }

    if (additionalTabs) {
      const extensionTab = additionalTabs.find((tab) => tab.id === activeTabId);
      if (extensionTab) {
        return <React.Fragment key={extensionTab.id}>{extensionTab.content}</React.Fragment>;
      }
    }

    return null;
  };

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 auto',
        minHeight: 0,
        borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
      }}
      data-test-subj="agentBuilderConversationSpineTabs"
    >
      <EuiTabs css={{ paddingInline: euiTheme.size.m }}>
        <React.Fragment key={record.type}>
          {typeSpecificTabs.map((tab) => (
            <EuiTab
              key={tab.id}
              css={typeSpecificTabStyles}
              isSelected={activeTabId === tab.id}
              onClick={() => onTabClick(tab.id)}
              data-test-subj={`agentBuilderConversationSpineTab-${tab.id}`}
            >
              {tab.name}
            </EuiTab>
          ))}
        </React.Fragment>
        {BASE_SPINE_TABS.map((tab) => (
          <EuiTab
            key={tab.id}
            isSelected={activeTabId === tab.id}
            onClick={() => onTabClick(tab.id)}
            data-test-subj={`agentBuilderConversationSpineTab-${tab.id}`}
          >
            {tab.name}
          </EuiTab>
        ))}
        {additionalTabs?.map((tab) => (
          <EuiTab
            key={tab.id}
            isSelected={activeTabId === tab.id}
            onClick={() => onTabClick(tab.id)}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 auto',
          minHeight: 0,
        }}
      >
        {renderTabContent()}
      </div>
    </div>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTab, EuiTabs, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import type { AttachmentsService } from '../../../services/attachments/attachements_service';
import { useConversationSpineContext } from '../conversation_spine_context';
import type { SpineTabDefinition, SpineTabId } from '../types';
import { AttachmentsTab } from './attachments_tab';
import { PeopleTab } from './people_tab';

const labels = {
  attachments: i18n.translate('xpack.agentBuilder.conversationSpine.tabs.attachments', {
    defaultMessage: 'Attachments',
  }),
  people: i18n.translate('xpack.agentBuilder.conversationSpine.tabs.people', {
    defaultMessage: 'People',
  }),
};

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

  const { activeTabId, attachmentsView } = spineState;

  const baseTabs: Array<{ id: SpineTabId; name: string }> = [
    { id: 'attachments', name: labels.attachments },
    { id: 'people', name: labels.people },
  ];

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
        {baseTabs.map((tab) => (
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
            onClick={() => setActiveTab(tab.id as SpineTabId)}
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
        {activeTabId === 'attachments' ? (
          <AttachmentsTab
            attachmentsService={attachmentsService}
            attachmentsView={attachmentsView}
          />
        ) : null}
        {activeTabId === 'people' ? <PeopleTab /> : null}
        {additionalTabs?.map((tab) =>
          activeTabId === tab.id ? (
            <React.Fragment key={tab.id}>{tab.content}</React.Fragment>
          ) : null
        )}
      </div>
    </div>
  );
};

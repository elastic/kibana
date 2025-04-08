/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { DataViewsContract } from '@kbn/data-views-plugin/public';
import { AIForSOCConnectorSettingsManagement } from '../../connectorland/ai_for_soc_connector_settings_management';
import * as i18n from './translations';
import { useAssistantContext } from '../../assistant_context';
import { useLoadConnectors } from '../../connectorland/use_load_connectors';
import { getDefaultConnector } from '../helpers';
import { ConversationSettingsManagement } from '../conversations/conversation_settings_management';
import { QuickPromptSettingsManagement } from '../quick_prompts/quick_prompt_settings_management';
import { SystemPromptSettingsManagement } from '../prompt_editor/system_prompt/system_prompt_settings_management';
import { AnonymizationSettingsManagement } from '../../data_anonymization/settings/anonymization_settings_management';

import {
  ANONYMIZATION_TAB,
  CONNECTORS_TAB,
  CONVERSATIONS_TAB,
  KNOWLEDGE_BASE_TAB,
  QUICK_PROMPTS_TAB,
  SYSTEM_PROMPTS_TAB,
} from './const';
import { KnowledgeBaseSettingsManagement } from '../../knowledge_base/knowledge_base_settings_management';
import { ManagementSettingsTabs } from './types';

interface Props {
  dataViews: DataViewsContract;
  onTabChange?: (tabId: string) => void;
  currentTab: ManagementSettingsTabs;
}

/**
 * Modal for overall Assistant Settings, including conversation settings, quick prompts, system prompts,
 * anonymization, knowledge base, and evaluation via the `isModelEvaluationEnabled` feature flag.
 */
export const AIForSOCSettingsManagement: React.FC<Props> = React.memo(
  ({ dataViews, onTabChange, currentTab }) => {
    const { http, selectedSettingsTab, setSelectedSettingsTab } = useAssistantContext();

    useEffect(() => {
      if (selectedSettingsTab) {
        // selectedSettingsTab can be selected from Conversations > System Prompts > Add System Prompt
        onTabChange?.(selectedSettingsTab);
        // set to null after nav change as to not persist the tab
        setSelectedSettingsTab(null);
      }
    }, [onTabChange, selectedSettingsTab, setSelectedSettingsTab]);

    const { data: connectors } = useLoadConnectors({
      http,
    });
    const defaultConnector = useMemo(() => getDefaultConnector(connectors), [connectors]);

    const { euiTheme } = useEuiTheme();

    const tabsConfig = useMemo(
      () => [
        {
          id: CONVERSATIONS_TAB,
          label: i18n.CONVERSATIONS_MENU_ITEM,
        },
        {
          id: CONNECTORS_TAB,
          label: i18n.CONNECTORS_MENU_ITEM,
        },
        {
          id: SYSTEM_PROMPTS_TAB,
          label: i18n.SYSTEM_PROMPTS_MENU_ITEM,
        },
        {
          id: QUICK_PROMPTS_TAB,
          label: i18n.QUICK_PROMPTS_MENU_ITEM,
        },
        {
          id: ANONYMIZATION_TAB,
          label: i18n.ANONYMIZATION_MENU_ITEM,
        },
        {
          id: KNOWLEDGE_BASE_TAB,
          label: i18n.KNOWLEDGE_BASE_MENU_ITEM,
        },
      ],
      []
    );

    const tabs = useMemo(() => {
      return tabsConfig.map((t) => ({
        ...t,
        onClick: () => {
          onTabChange?.(t.id);
        },
        isSelected: t.id === currentTab,
      }));
    }, [onTabChange, currentTab, tabsConfig]);
    return (
      <EuiFlexGroup
        css={css`
          margin-top: ${euiTheme.size.l};
        `}
      >
        <EuiFlexItem grow={false} css={{ width: '200px' }}>
          <EuiListGroup flush>
            {tabs.map(({ id, label, onClick, isSelected }) => (
              <EuiListGroupItem
                key={id}
                label={label}
                onClick={onClick}
                data-test-subj={`settingsPageTab-${id}`}
                isActive={isSelected}
                size="s"
              />
            ))}
          </EuiListGroup>
        </EuiFlexItem>
        <EuiFlexItem data-test-subj={`tab-${currentTab}`}>
          {currentTab === CONNECTORS_TAB && <AIForSOCConnectorSettingsManagement />}
          {currentTab === CONVERSATIONS_TAB && (
            <ConversationSettingsManagement
              connectors={connectors}
              defaultConnector={defaultConnector}
            />
          )}
          {currentTab === SYSTEM_PROMPTS_TAB && (
            <SystemPromptSettingsManagement
              connectors={connectors}
              defaultConnector={defaultConnector}
            />
          )}
          {currentTab === QUICK_PROMPTS_TAB && <QuickPromptSettingsManagement />}
          {currentTab === ANONYMIZATION_TAB && <AnonymizationSettingsManagement />}
          {currentTab === KNOWLEDGE_BASE_TAB && (
            <KnowledgeBaseSettingsManagement dataViews={dataViews} />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

AIForSOCSettingsManagement.displayName = 'AIForSOCSettingsManagement';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
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
  EVALUATION_TAB,
  KNOWLEDGE_BASE_TAB,
  QUICK_PROMPTS_TAB,
  SYSTEM_PROMPTS_TAB,
} from './const';
import { KnowledgeBaseSettingsManagement } from '../../knowledge_base/knowledge_base_settings_management';
import { ManagementSettingsTabs } from './types';
import { EvaluationSettings } from './evaluation_settings/evaluation_settings';

interface Props {
  dataViews: DataViewsContract;
  onTabChange?: (tabId: string) => void;
  currentTab: ManagementSettingsTabs;
}

/**
 * Modal for overall Assistant Settings, including conversation settings, quick prompts, system prompts,
 * anonymization, knowledge base, and evaluation via the `isModelEvaluationEnabled` feature flag.
 */
export const SearchAILakeConfigurationsSettingsManagement: React.FC<Props> = React.memo(
  ({ dataViews, onTabChange, currentTab }) => {
    const {
      assistantFeatures: { assistantModelEvaluation: modelEvaluatorEnabled },
      http,
      selectedSettingsTab,
      setSelectedSettingsTab,
    } = useAssistantContext();

    useEffect(() => {
      if (selectedSettingsTab) {
        // selectedSettingsTab can be selected from Conversations > System Prompts > Add System Prompt
        onTabChange?.(selectedSettingsTab);
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
        ...(modelEvaluatorEnabled
          ? [
              {
                id: EVALUATION_TAB,
                label: i18n.EVALUATION_MENU_ITEM,
              },
            ]
          : []),
      ],
      [modelEvaluatorEnabled]
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

    const renderTabBody = useCallback(() => {
      switch (currentTab) {
        case CONNECTORS_TAB:
          return <AIForSOCConnectorSettingsManagement />;
        case SYSTEM_PROMPTS_TAB:
          return (
            <SystemPromptSettingsManagement
              connectors={connectors}
              defaultConnector={defaultConnector}
            />
          );
        case QUICK_PROMPTS_TAB:
          return <QuickPromptSettingsManagement />;
        case ANONYMIZATION_TAB:
          return <AnonymizationSettingsManagement />;
        case KNOWLEDGE_BASE_TAB:
          return <KnowledgeBaseSettingsManagement dataViews={dataViews} />;
        case EVALUATION_TAB:
          return modelEvaluatorEnabled ? (
            <EvaluationSettings />
          ) : (
            <ConversationSettingsManagement
              connectors={connectors}
              defaultConnector={defaultConnector}
            />
          );
        case CONVERSATIONS_TAB:
        default:
          return (
            <ConversationSettingsManagement
              connectors={connectors}
              defaultConnector={defaultConnector}
            />
          );
      }
    }, [connectors, currentTab, dataViews, defaultConnector, modelEvaluatorEnabled]);
    return (
      <EuiFlexGroup
        data-test-subj="SearchAILakeConfigurationsSettingsManagement"
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
        <EuiFlexItem data-test-subj={`tab-${currentTab}`}>{renderTabBody()}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

SearchAILakeConfigurationsSettingsManagement.displayName =
  'SearchAILakeConfigurationsSettingsManagement';

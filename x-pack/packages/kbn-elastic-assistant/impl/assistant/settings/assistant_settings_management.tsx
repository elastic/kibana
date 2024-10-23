/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiAvatar, EuiPageTemplate, EuiTitle, useEuiShadow, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { DataViewsContract } from '@kbn/data-views-plugin/public';
import { Conversation } from '../../..';
import * as i18n from './translations';
import { useAssistantContext } from '../../assistant_context';
import { useLoadConnectors } from '../../connectorland/use_load_connectors';
import { getDefaultConnector } from '../helpers';
import { ConnectorsSettingsManagement } from '../../connectorland/connector_settings_management';
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
import { EvaluationSettings } from '.';
import { SettingsTabs } from './types';

interface Props {
  dataViews: DataViewsContract;
  selectedConversation: Conversation;
  onTabChange?: (tabId: string) => void;
  currentTab: SettingsTabs;
}

/**
 * Modal for overall Assistant Settings, including conversation settings, quick prompts, system prompts,
 * anonymization, knowledge base, and evaluation via the `isModelEvaluationEnabled` feature flag.
 */
export const AssistantSettingsManagement: React.FC<Props> = React.memo(
  ({
    dataViews,
    selectedConversation: defaultSelectedConversation,
    onTabChange,
    currentTab: selectedSettingsTab,
  }) => {
    const {
      assistantFeatures: { assistantModelEvaluation: modelEvaluatorEnabled },
      http,
    } = useAssistantContext();
    const { data: connectors } = useLoadConnectors({
      http,
    });
    const defaultConnector = useMemo(() => getDefaultConnector(connectors), [connectors]);

    const { euiTheme } = useEuiTheme();
    const headerIconShadow = useEuiShadow('s');

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
        'data-test-subj': `settingsPageTab-${t.id}`,
        onClick: () => {
          onTabChange?.(t.id);
        },
        isSelected: t.id === selectedSettingsTab,
      }));
    }, [onTabChange, selectedSettingsTab, tabsConfig]);

    return (
      <>
        <EuiPageTemplate.Header
          pageTitle={
            <>
              <EuiAvatar
                iconType="logoSecurity"
                iconSize="m"
                color="plain"
                name={i18n.SECURITY_AI_SETTINGS}
                css={css`
                  ${headerIconShadow};
                  margin-right: ${euiTheme.base * 0.75}px;
                `}
              />
              <EuiTitle size="m" className="eui-displayInlineBlock">
                <span>{i18n.SECURITY_AI_SETTINGS}</span>
              </EuiTitle>
            </>
          }
          tabs={tabs}
          paddingSize="none"
        />
        <EuiPageTemplate.Section
          paddingSize="none"
          css={css`
            padding-left: 0;
            padding-right: 0;
            padding-top: ${euiTheme.base * 0.75}px;
            padding-bottom: ${euiTheme.base * 0.75}px;
          `}
          data-test-subj={`tab-${selectedSettingsTab}`}
        >
          {selectedSettingsTab === CONNECTORS_TAB && <ConnectorsSettingsManagement />}
          {selectedSettingsTab === CONVERSATIONS_TAB && (
            <ConversationSettingsManagement
              connectors={connectors}
              defaultConnector={defaultConnector}
              defaultSelectedConversation={defaultSelectedConversation}
            />
          )}
          {selectedSettingsTab === SYSTEM_PROMPTS_TAB && (
            <SystemPromptSettingsManagement
              connectors={connectors}
              defaultConnector={defaultConnector}
            />
          )}
          {selectedSettingsTab === QUICK_PROMPTS_TAB && <QuickPromptSettingsManagement />}
          {selectedSettingsTab === ANONYMIZATION_TAB && <AnonymizationSettingsManagement />}
          {selectedSettingsTab === KNOWLEDGE_BASE_TAB && (
            <KnowledgeBaseSettingsManagement dataViews={dataViews} />
          )}
          {selectedSettingsTab === EVALUATION_TAB && <EvaluationSettings />}
        </EuiPageTemplate.Section>
      </>
    );
  }
);

AssistantSettingsManagement.displayName = 'AssistantSettingsManagement';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiAvatar, EuiPageTemplate, EuiTitle, useEuiShadow, useEuiTheme } from '@elastic/eui';

import { css } from '@emotion/react';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { useQuery } from '@tanstack/react-query';
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
import { KnowledgeBaseSettingsManagement } from '../../knowledge_base/knowledge_base_settings_management';
import { EvaluationSettings } from '.';

import {
  ANONYMIZATION_TAB,
  CONNECTORS_TAB,
  CONVERSATIONS_TAB,
  EVALUATION_TAB,
  KNOWLEDGE_BASE_TAB,
  QUICK_PROMPTS_TAB,
  SYSTEM_PROMPTS_TAB,
} from './const';

interface Props {
  selectedConversation: Conversation;
  spacesApi: SpacesPluginStart;
}

/**
 * Modal for overall Assistant Settings, including conversation settings, quick prompts, system prompts,
 * anonymization, knowledge base, and evaluation via the `isModelEvaluationEnabled` feature flag.
 */
export const AssistantSettingsManagement: React.FC<Props> = React.memo(
  ({ selectedConversation: defaultSelectedConversation, spacesApi }) => {
    const {
      assistantFeatures: { assistantModelEvaluation: modelEvaluatorEnabled },
      http,
      selectedSettingsTab,
      setSelectedSettingsTab,
    } = useAssistantContext();

    const { spacesDataPromise } = spacesApi?.ui.useSpaces();
    const { data: currentSpaces } = useQuery({
      queryKey: ['currentSpaces'],
      queryFn: () => spacesDataPromise,
      select: (data) => data,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    });

    const { data: connectors } = useLoadConnectors({
      http,
    });
    const defaultConnector = useMemo(() => getDefaultConnector(connectors), [connectors]);

    const { euiTheme } = useEuiTheme();
    const headerIconShadow = useEuiShadow('s');

    useEffect(() => {
      if (selectedSettingsTab == null) {
        setSelectedSettingsTab(KNOWLEDGE_BASE_TAB);
      }
    }, [selectedSettingsTab, setSelectedSettingsTab]);

    const tabsConfig = useMemo(
      () => [
        {
          id: CONNECTORS_TAB,
          label: i18n.CONNECTORS_MENU_ITEM,
        },
        {
          id: CONVERSATIONS_TAB,
          label: i18n.CONVERSATIONS_MENU_ITEM,
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
        onClick: () => setSelectedSettingsTab(t.id),
        isSelected: t.id === selectedSettingsTab,
      }));
    }, [setSelectedSettingsTab, selectedSettingsTab, tabsConfig]);

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
          {selectedSettingsTab === KNOWLEDGE_BASE_TAB && <KnowledgeBaseSettingsManagement />}
          {selectedSettingsTab === EVALUATION_TAB && <EvaluationSettings />}
        </EuiPageTemplate.Section>
      </>
    );
  }
);

AssistantSettingsManagement.displayName = 'AssistantSettingsManagement';

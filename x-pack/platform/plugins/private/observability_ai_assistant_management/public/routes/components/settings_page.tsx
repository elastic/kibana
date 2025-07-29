/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAvatar,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { useKnowledgeBase } from '@kbn/ai-assistant';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAppContext } from '../../hooks/use_app_context';
import { SettingsTab } from './settings_tab/settings_tab';
import { KnowledgeBaseTab } from './knowledge_base_tab';
import { useObservabilityAIAssistantManagementRouterParams } from '../../hooks/use_observability_management_params';
import { useObservabilityAIAssistantManagementRouter } from '../../hooks/use_observability_management_router';
import type { TabsRt } from '../config';
import { useKibana } from '../../hooks/use_kibana';

export function SettingsPage() {
  const { setBreadcrumbs } = useAppContext();
  const {
    services: {
      application: { navigateToApp },
      serverless,
    },
  } = useKibana();

  const router = useObservabilityAIAssistantManagementRouter();
  const knowledgeBase = useKnowledgeBase();

  const {
    query: { tab },
  } = useObservabilityAIAssistantManagementRouterParams('/');

  useEffect(() => {
    if (serverless) {
      serverless.setBreadcrumbs([
        {
          text: i18n.translate(
            'xpack.observabilityAiAssistantManagement.breadcrumb.serverless.observability',
            {
              defaultMessage: 'AI Assistant',
            }
          ),
        },
      ]);
    } else {
      setBreadcrumbs([
        {
          text: i18n.translate('xpack.observabilityAiAssistantManagement.breadcrumb.index', {
            defaultMessage: 'AI Assistants',
          }),
          onClick: (e) => {
            e.preventDefault();
            navigateToApp('management', { path: '/ai/aiAssistantManagementSelection' });
          },
        },
        {
          text: i18n.translate(
            'xpack.observabilityAiAssistantManagement.breadcrumb.observability',
            {
              defaultMessage: 'Observability and Search',
            }
          ),
        },
      ]);
    }
  }, [navigateToApp, serverless, setBreadcrumbs]);

  const tabs: Array<{ id: TabsRt; name: string; content: JSX.Element; disabled?: boolean }> = [
    {
      id: 'settings',
      name: i18n.translate('xpack.observabilityAiAssistantManagement.settingsPage.settingsLabel', {
        defaultMessage: 'Settings',
      }),
      content: <SettingsTab />,
    },
    {
      id: 'knowledge_base',
      name: i18n.translate(
        'xpack.observabilityAiAssistantManagement.settingsPage.knowledgeBaseLabel',
        {
          defaultMessage: 'Knowledge base',
        }
      ),
      content: <KnowledgeBaseTab />,
      disabled: !knowledgeBase.status.value?.enabled,
    },
  ];

  const selectedTabId = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;
  const selectedTabContent = tabs.find((obj) => obj.id === selectedTabId)?.content;

  const onSelectedTabChanged = (id: TabsRt) => {
    router.push('/', { path: '/', query: { tab: id } });
  };

  const headerIconShadow = useEuiShadow('s');
  const { euiTheme } = useEuiTheme();

  return (
    <div data-test-subj="aiAssistantSettingsPage">
      <EuiFlexGroup gutterSize="none" alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="none" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiAvatar
                    iconType="logoObservability"
                    iconSize="m"
                    color="plain"
                    name={i18n.translate(
                      'xpack.observabilityAiAssistantManagement.settingsPage.observabilityAvatarLabel',
                      {
                        defaultMessage: 'Observability AI',
                      }
                    )}
                    css={css`
                      ${headerIconShadow};
                    `}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiAvatar
                    iconType="logoEnterpriseSearch"
                    iconSize="m"
                    color="plain"
                    name={i18n.translate(
                      'xpack.observabilityAiAssistantManagement.settingsPage.searchAvatarLabel',
                      {
                        defaultMessage: 'Enterprise Search AI',
                      }
                    )}
                    css={css`
                      ${headerIconShadow};
                      margin-right: ${euiTheme.size.m};
                    `}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle size="m">
                <h2>
                  <FormattedMessage
                    id="xpack.observabilityAiAssistantManagement.settingsPage.h2.settingsLabel"
                    defaultMessage="AI Assistant for Observability and Search"
                  />
                </h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="gear"
            size="m"
            onClick={() => navigateToApp('management', { path: 'ai/genAiSettings' })}
            data-test-subj="genAiSettingsButton"
          >
            <FormattedMessage
              id="xpack.observabilityAiAssistantManagement.settingsPage.genAiSettingsButton"
              defaultMessage="GenAI Settings"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiTabs data-test-subj="settingsPageTabs">
        {tabs
          .filter((t) => !t.disabled)
          .map((t, index) => (
            <EuiTab
              key={index}
              data-test-subj={`settingsPageTab-${t.id}`}
              onClick={() => onSelectedTabChanged(t.id)}
              isSelected={t.id === selectedTabId}
            >
              {t.name}
            </EuiTab>
          ))}
      </EuiTabs>

      <EuiSpacer size="l" />

      {selectedTabContent}

      <EuiSpacer size="l" />
    </div>
  );
}

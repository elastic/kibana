/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  useEuiTheme,
} from '@elastic/eui';
import { useKnowledgeBase } from '@kbn/ai-assistant';
import { SolutionView } from '@kbn/spaces-plugin/common';
import { useAppContext } from '../../hooks/use_app_context';
import { SettingsTab } from './settings_tab/settings_tab';
import { KnowledgeBaseTab } from './knowledge_base_tab';
import { useObservabilityAIAssistantManagementRouterParams } from '../../hooks/use_observability_management_params';
import { useObservabilityAIAssistantManagementRouter } from '../../hooks/use_observability_management_router';
import type { TabsRt } from '../config';
import { SearchConnectorTab } from './search_connector_tab';
import { useKibana } from '../../hooks/use_kibana';

export function SettingsPage() {
  const { setBreadcrumbs } = useAppContext();
  const {
    services: {
      application: { navigateToApp, isAppRegistered },
      serverless,
      spaces,
      cloud,
    },
  } = useKibana();

  const router = useObservabilityAIAssistantManagementRouter();
  const knowledgeBase = useKnowledgeBase();
  const { euiTheme } = useEuiTheme();

  const [currentSpaceSolution, setCurrentSpaceSolution] = useState<SolutionView>();

  // Determine the current solution. For serverless projects, derive it from cloud.serverless.projectType
  const currentSolution: SolutionView | undefined = serverless
    ? cloud?.serverless?.projectType === 'observability'
      ? 'oblt'
      : 'es'
    : currentSpaceSolution;

  const {
    query: { tab },
  } = useObservabilityAIAssistantManagementRouterParams('/');

  useEffect(() => {
    const getCurrentSpace = async () => {
      if (spaces) {
        const space = await spaces.getActiveSpace();
        setCurrentSpaceSolution(space?.solution);
      }
    };

    getCurrentSpace();
  }, [spaces]);

  let breadcrumbText: string;
  let title: string;
  if (currentSolution === 'oblt') {
    breadcrumbText = i18n.translate(
      'xpack.observabilityAiAssistantManagement.breadcrumb.observability',
      {
        defaultMessage: 'Observability',
      }
    );

    title = i18n.translate(
      'xpack.observabilityAiAssistantManagement.settingsPage.title.observability',
      {
        defaultMessage: 'AI Assistant for Observability',
      }
    );
  } else if (currentSolution === 'es') {
    breadcrumbText = i18n.translate('xpack.observabilityAiAssistantManagement.breadcrumb.search', {
      defaultMessage: 'Search',
    });

    title = i18n.translate('xpack.observabilityAiAssistantManagement.settingsPage.title.search', {
      defaultMessage: 'AI Assistant for Search',
    });
  } else {
    breadcrumbText = i18n.translate(
      'xpack.observabilityAiAssistantManagement.breadcrumb.observabilityAndSearch',
      {
        defaultMessage: 'Observability and Search',
      }
    );

    title = i18n.translate(
      'xpack.observabilityAiAssistantManagement.settingsPage.title.observabilityAndSearch',
      {
        defaultMessage: 'AI Assistant for Observability and Search',
      }
    );
  }

  useEffect(() => {
    if (serverless) {
      serverless.setBreadcrumbs([
        {
          text: breadcrumbText,
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
            navigateToApp('management', { path: '/kibana/aiAssistantManagementSelection' });
          },
        },
        {
          text: breadcrumbText,
        },
      ]);
    }
  }, [breadcrumbText, navigateToApp, serverless, setBreadcrumbs]);

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
          defaultMessage: 'Knowledge Base',
        }
      ),
      content: <KnowledgeBaseTab />,
      disabled: !knowledgeBase.status.value?.enabled,
    },
    {
      id: 'search_connector',
      name: i18n.translate(
        'xpack.observabilityAiAssistantManagement.settingsPage.searchConnector',
        {
          defaultMessage: 'Search Connectors',
        }
      ),
      content: <SearchConnectorTab />,
      disabled: !isAppRegistered('enterpriseSearch'),
    },
  ];

  const logos =
    currentSpaceSolution === 'oblt'
      ? ['logoObservability']
      : currentSpaceSolution === 'es'
      ? ['logoEnterpriseSearch']
      : ['logoObservability', 'logoEnterpriseSearch'];

  const selectedTabId = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;
  const selectedTabContent = tabs.find((obj) => obj.id === selectedTabId)?.content;

  const onSelectedTabChanged = (id: TabsRt) => {
    router.push('/', { path: '/', query: { tab: id } });
  };

  return (
    <div data-test-subj="aiAssistantSettingsPage">
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="s"
        responsive={false}
      >
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} direction="row">
          {logos.map((logo) => (
            <EuiFlexItem key={logo} grow={false}>
              <EuiIcon
                size="xl"
                type={logo}
                style={{
                  backgroundColor: euiTheme.colors.backgroundBasePlain,
                  borderRadius: '50%',
                  padding: 6,
                  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.12)',
                }}
              />
            </EuiFlexItem>
          ))}
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h2>{title}</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="gear"
            onClick={() => navigateToApp('management', { path: 'kibana/genAiSettings' })} // TODO: update path when available
            data-test-subj="genAiSettingsLink"
          >
            {i18n.translate(
              'xpack.observabilityAiAssistantManagement.settingsPage.genAiSettingsLinkLabel',
              {
                defaultMessage: 'GenAI Settings',
              }
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

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

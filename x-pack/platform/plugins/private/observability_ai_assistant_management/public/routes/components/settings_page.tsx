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
  useEuiShadow,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useKnowledgeBase } from '@kbn/ai-assistant';
import type { SolutionView } from '@kbn/spaces-plugin/common';
import type { TabsRt } from '../config';
import { useAppContext } from '../../hooks/use_app_context';
import { SettingsTab } from './settings_tab/settings_tab';
import { KnowledgeBaseTab } from './knowledge_base_tab';
import { useKibana } from '../../hooks/use_kibana';
import { ContentConnectorTab } from './content_connector_tab';
import { getSolutionSpecificLogos } from '../../helpers/get_solution_specific_logos';
import { getSolutionSpecificLabels } from '../../helpers/get_solution_specific_labels';
import { useObservabilityAIAssistantManagementRouterParams } from '../../hooks/use_observability_management_params';
import { useObservabilityAIAssistantManagementRouter } from '../../hooks/use_observability_management_router';

export function SettingsPage() {
  const { setBreadcrumbs } = useAppContext();
  const {
    services: {
      application: { navigateToApp, capabilities },
      serverless,
      spaces,
      cloud,
    },
  } = useKibana();

  const router = useObservabilityAIAssistantManagementRouter();
  const knowledgeBase = useKnowledgeBase();
  const { euiTheme } = useEuiTheme();
  const headerIconShadow = useEuiShadow('s');

  const [currentSpaceSolution, setCurrentSpaceSolution] = useState<SolutionView>();

  // Determine the current solution.
  let currentSolution: SolutionView | undefined;
  if (serverless) {
    const projectType = cloud?.serverless?.projectType;
    currentSolution = projectType === 'observability' ? 'oblt' : 'es';
  } else {
    currentSolution = currentSpaceSolution;
  }

  const hasConnectorsAllPrivilege =
    capabilities.actions?.show === true &&
    capabilities.actions?.execute === true &&
    capabilities.actions?.delete === true &&
    capabilities.actions?.save === true;

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

  const { breadcrumbText, title } = getSolutionSpecificLabels({
    solution: currentSolution,
    isServerless: !!serverless,
  });

  const logos = getSolutionSpecificLogos(currentSolution);

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
            navigateToApp('management', { path: '/ai/aiAssistantManagementSelection' });
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
      id: 'content_connector',
      name: i18n.translate(
        'xpack.observabilityAiAssistantManagement.settingsPage.contentConnector',
        {
          defaultMessage: 'Content Connectors',
        }
      ),
      content: <ContentConnectorTab />,
      disabled: serverless && currentSolution === 'es',
    },
  ];

  const selectedTabId = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;
  const selectedTabContent = tabs.find((obj) => obj.id === selectedTabId)?.content;

  const onSelectedTabChanged = (id: TabsRt) => {
    router.push('/', { path: '/', query: { tab: id } });
  };

  return (
    <div data-test-subj="aiAssistantSettingsPage">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
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
                }}
                css={css`
                  ${headerIconShadow};
                `}
              />
            </EuiFlexItem>
          ))}
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h2>{title}</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        {hasConnectorsAllPrivilege ? (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="gear"
              size="m"
              onClick={() => navigateToApp('management', { path: 'ai/genAiSettings' })}
              data-test-subj="genAiSettingsButton"
            >
              {i18n.translate(
                'xpack.observabilityAiAssistantManagement.settingsPage.genAiSettingsButton',
                {
                  defaultMessage: 'GenAI Settings',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ) : null}
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

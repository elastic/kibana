/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { labels } from '../../../utils/i18n';
import { appPaths } from '../../../utils/app_paths';
import { useNavigation } from '../../../hooks/use_navigation';
import { useExperimentalFeatures } from '../../../hooks/use_experimental_features';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { CustomizeLandingEmptyState } from '../common/customize_landing_empty_state';
import pluginsIllustration from '../overview/assets/projects-folder.svg';
import { PluginAddMenuPanel } from './plugin_add_menu_panel';

export interface PluginsCustomizeEmptyStateProps {
  canEditAgent: boolean;
  onAddFromLibrary: () => void;
  onInstallFromUrlOrZip: () => void;
}

export const PluginsCustomizeEmptyState: React.FC<PluginsCustomizeEmptyStateProps> = ({
  canEditAgent,
  onAddFromLibrary,
  onInstallFromUrlOrZip,
}) => {
  const { agentId } = useParams<{ agentId: string }>();
  const { createAgentBuilderUrl, navigateToAgentBuilderUrl } = useNavigation();
  const isExperimentalFeaturesEnabled = useExperimentalFeatures();
  const { docLinksService } = useAgentBuilderServices();
  const [isInstallMenuOpen, setIsInstallMenuOpen] = useState(false);

  const closeInstallMenu = () => setIsInstallMenuOpen(false);

  const description = isExperimentalFeaturesEnabled ? (
    <FormattedMessage
      id="xpack.agentBuilder.agentPlugins.customizeEmptyStateDescription"
      defaultMessage="Each plugin adds a bundle of related skills to your agent in a single install. For individual capabilities, use {skills}. For callable functions and integrations, use {tools}."
      values={{
        skills: (
          <EuiLink
            data-test-subj="agentPluginsCustomizeEmptyStateLinkSkills"
            onClick={() => navigateToAgentBuilderUrl(appPaths.agent.skills({ agentId: agentId! }))}
            {...getEbtProps({
              element: AGENT_BUILDER_UI_EBT.element.pageContent,
              action: AGENT_BUILDER_UI_EBT.action.libraryPanel.CROSS_NAV_LINK,
              detail: AGENT_BUILDER_UI_EBT.entity.SKILL,
            })}
          >
            Skills
          </EuiLink>
        ),
        tools: (
          <EuiLink
            data-test-subj="agentPluginsCustomizeEmptyStateLinkTools"
            onClick={() => navigateToAgentBuilderUrl(appPaths.agent.tools({ agentId: agentId! }))}
            {...getEbtProps({
              element: AGENT_BUILDER_UI_EBT.element.pageContent,
              action: AGENT_BUILDER_UI_EBT.action.libraryPanel.CROSS_NAV_LINK,
              detail: AGENT_BUILDER_UI_EBT.entity.TOOL,
            })}
          >
            Tools
          </EuiLink>
        ),
      }}
    />
  ) : (
    <FormattedMessage
      id="xpack.agentBuilder.agentPlugins.customizeEmptyStateDescriptionNoExperimental"
      defaultMessage="Each plugin adds a bundle of related skills to your agent in a single install. For individual capabilities, use {skills}."
      values={{
        skills: (
          <EuiLink
            data-test-subj="agentPluginsCustomizeEmptyStateLinkSkills"
            onClick={() => navigateToAgentBuilderUrl(appPaths.agent.skills({ agentId: agentId! }))}
            {...getEbtProps({
              element: AGENT_BUILDER_UI_EBT.element.pageContent,
              action: AGENT_BUILDER_UI_EBT.action.libraryPanel.CROSS_NAV_LINK,
              detail: AGENT_BUILDER_UI_EBT.entity.SKILL,
            })}
          >
            Skills
          </EuiLink>
        ),
      }}
    />
  );

  const footer = (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type="info" color="subdued" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s" color="subdued">
          {labels.agentPlugins.emptyStateFooter}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <CustomizeLandingEmptyState
      dataTestSubj="agentPluginsCustomizeEmptyState"
      illustrationSrc={pluginsIllustration}
      title={labels.agentPlugins.emptyStateTitle}
      description={description}
      learnMoreHref={docLinksService.agentBuilderPlugins}
      learnMoreLabel={labels.customizeLandingEmptyState.learnMore}
      learnMoreSuffix={labels.agentPlugins.emptyStateLearnMoreSuffix}
      footer={footer}
      learnMoreEbtProps={getEbtProps({
        element: AGENT_BUILDER_UI_EBT.element.pageContent,
        action: AGENT_BUILDER_UI_EBT.action.libraryPanel.LEARN_MORE_DOCS,
        detail: AGENT_BUILDER_UI_EBT.entity.PLUGIN,
      })}
      primaryAction={
        canEditAgent ? (
          <EuiPopover
            aria-label={labels.agentPlugins.emptyStateAddButton}
            button={
              <EuiButton
                data-test-subj="agentPluginsCustomizeEmptyStateInstallButton"
                fill
                iconType="plus"
                iconSide="left"
                onClick={() => setIsInstallMenuOpen((prev) => !prev)}
                {...getEbtProps({
                  element: AGENT_BUILDER_UI_EBT.element.pageContent,
                  action: AGENT_BUILDER_UI_EBT.action.libraryPanel.EMPTY_STATE_OPEN_LIBRARY,
                  detail: AGENT_BUILDER_UI_EBT.entity.PLUGIN,
                })}
              >
                {labels.agentPlugins.emptyStateAddButton}
              </EuiButton>
            }
            isOpen={isInstallMenuOpen}
            closePopover={closeInstallMenu}
            anchorPosition="downCenter"
            panelPaddingSize="none"
          >
            <PluginAddMenuPanel
              onInstallFromUrlOrZip={() => {
                closeInstallMenu();
                onInstallFromUrlOrZip();
              }}
              onAddFromLibrary={() => {
                closeInstallMenu();
                onAddFromLibrary();
              }}
            />
          </EuiPopover>
        ) : undefined
      }
      secondaryAction={
        <EuiButtonEmpty
          href={createAgentBuilderUrl(appPaths.manage.plugins)}
          {...getEbtProps({
            element: AGENT_BUILDER_UI_EBT.element.pageContent,
            action: AGENT_BUILDER_UI_EBT.action.libraryPanel.EMPTY_STATE_MANAGE_ALL,
            detail: AGENT_BUILDER_UI_EBT.entity.PLUGIN,
          })}
        >
          {labels.agentPlugins.manageAllPlugins}
        </EuiButtonEmpty>
      }
    />
  );
};

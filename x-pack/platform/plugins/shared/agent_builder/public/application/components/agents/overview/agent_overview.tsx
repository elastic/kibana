/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { canChangeAgentVisibility } from '@kbn/agent-builder-common';
import { useAgentBuilderAgentById } from '../../../hooks/agents/use_agent_by_id';
import { useCanEditAgent } from '../../../hooks/agents/use_can_edit_agent';
import { useSkillsService } from '../../../hooks/skills/use_skills';
import { usePluginsService } from '../../../hooks/plugins/use_plugins';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useExperimentalFeatures } from '../../../hooks/use_experimental_features';
import { useKibana } from '../../../hooks/use_kibana';
import { useUiPrivileges } from '../../../hooks/use_ui_privileges';
import { useCurrentUser } from '../../../hooks/agents/use_current_user';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';
import { isPreExecutionWorkflowEnabled } from '../../../utils/is_pre_execution_workflow_enabled';
import { AgentHeader } from './agent_header';
import { CapabilitiesSection } from './capabilities_section';
import { EditDetailsFlyout } from './edit_details_flyout';
import { SettingsSection } from './settings_section';
import { PageWrapper } from '../common/page_wrapper';

export const AgentOverview: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { euiTheme } = useEuiTheme();
  const { docLinksService } = useAgentBuilderServices();
  const { navigateToAgentBuilderUrl, createAgentBuilderUrl } = useNavigation();

  const isExperimentalFeaturesEnabled = useExperimentalFeatures();
  const {
    services: { uiSettings },
  } = useKibana();

  const { isAdmin } = useUiPrivileges();
  const { currentUser } = useCurrentUser();

  const { agent, isLoading } = useAgentBuilderAgentById(agentId);
  const { skills: allSkills } = useSkillsService();
  const { plugins: allPlugins } = usePluginsService();
  const [isEditFlyoutOpen, setIsEditFlyoutOpen] = useState(false);
  const canEditAgent = useCanEditAgent({ agent });

  const canChangeVisibility = useMemo(() => {
    if (!isExperimentalFeaturesEnabled || !agent) return false;
    return canChangeAgentVisibility({
      agentId: agent.id,
      owner: agent.created_by,
      currentUser: currentUser ?? undefined,
      isAdmin,
    });
  }, [isExperimentalFeaturesEnabled, agent, currentUser, isAdmin]);

  const showWorkflowSection = isPreExecutionWorkflowEnabled(uiSettings);

  const enableElasticCapabilities = agent?.configuration?.enable_elastic_capabilities ?? false;

  const agentSkillIdSet = useMemo(
    () => new Set(agent?.configuration?.skill_ids ?? []),
    [agent?.configuration?.skill_ids]
  );

  const builtinSkills = useMemo(() => allSkills.filter((s) => s.readonly), [allSkills]);

  const skillsCount = useMemo(() => {
    const explicitCount = agent?.configuration?.skill_ids?.length ?? 0;
    if (!enableElasticCapabilities) return explicitCount;
    const builtinNotExplicit = builtinSkills.filter((s) => !agentSkillIdSet.has(s.id)).length;
    return explicitCount + builtinNotExplicit;
  }, [agent?.configuration?.skill_ids, enableElasticCapabilities, builtinSkills, agentSkillIdSet]);

  const agentPluginIdSet = useMemo(
    () => new Set(agent?.configuration?.plugin_ids ?? []),
    [agent?.configuration?.plugin_ids]
  );

  const builtinPlugins = useMemo(() => allPlugins.filter((p) => p.readonly), [allPlugins]);

  const pluginsCount = useMemo(() => {
    const explicitCount = agent?.configuration?.plugin_ids?.length ?? 0;
    if (!enableElasticCapabilities) return explicitCount;
    const builtinNotExplicit = builtinPlugins.filter((p) => !agentPluginIdSet.has(p.id)).length;
    return explicitCount + builtinNotExplicit;
  }, [
    agent?.configuration?.plugin_ids,
    enableElasticCapabilities,
    builtinPlugins,
    agentPluginIdSet,
  ]);
  if (isLoading || !agent) {
    return (
      <EuiFlexGroup
        alignItems="center"
        justifyContent="center"
        css={css`
          padding: ${euiTheme.size.xxl};
          height: 100%;
        `}
      >
        <EuiLoadingSpinner size="xl" />
      </EuiFlexGroup>
    );
  }

  const containerStyles = css`
    padding: ${euiTheme.size.l} ${euiTheme.size.xl};
    overflow-y: auto;
    height: 100%;
  `;

  return (
    <PageWrapper>
      <div css={containerStyles} data-test-subj="agentOverviewPage">
        <AgentHeader
          agent={agent}
          docsUrl={docLinksService.agentBuilderAgents}
          canEditAgent={canEditAgent}
          onEditDetails={() => setIsEditFlyoutOpen(true)}
        />

        <EuiSpacer size="xl" />
        <EuiHorizontalRule margin="none" />
        <EuiSpacer size="xl" />

        <CapabilitiesSection
          skillsCount={skillsCount}
          pluginsCount={pluginsCount}
          enableElasticCapabilities={enableElasticCapabilities}
          isExperimentalFeaturesEnabled={isExperimentalFeaturesEnabled}
          skillsHref={createAgentBuilderUrl(appPaths.agent.skills({ agentId: agentId! }))}
          pluginsHref={createAgentBuilderUrl(appPaths.agent.plugins({ agentId: agentId! }))}
          onNavigateToSkills={() =>
            navigateToAgentBuilderUrl(appPaths.agent.skills({ agentId: agentId! }))
          }
          onNavigateToPlugins={() =>
            navigateToAgentBuilderUrl(appPaths.agent.plugins({ agentId: agentId! }))
          }
        />

        <EuiSpacer size="xl" />

        <SettingsSection
          enableElasticCapabilities={enableElasticCapabilities}
          currentInstructions={agent.configuration?.instructions ?? ''}
          showWorkflowSection={showWorkflowSection}
          workflowIds={agent.configuration?.workflow_ids ?? []}
          canEditAgent={canEditAgent}
          onOpenEditFlyout={() => setIsEditFlyoutOpen(true)}
        />

        {isEditFlyoutOpen && agent && (
          <EditDetailsFlyout
            agent={agent}
            onClose={() => setIsEditFlyoutOpen(false)}
            isExperimentalFeaturesEnabled={isExperimentalFeaturesEnabled}
            canChangeVisibility={canChangeVisibility}
            showWorkflowSection={showWorkflowSection}
          />
        )}
      </div>
    </PageWrapper>
  );
};

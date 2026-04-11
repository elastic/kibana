/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { hasAgentWriteAccess } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_CONNECTORS_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useAgentBuilderAgentById } from '../../../hooks/agents/use_agent_by_id';
import { useSkillsService } from '../../../hooks/skills/use_skills';
import { usePluginsService } from '../../../hooks/plugins/use_plugins';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useExperimentalFeatures } from '../../../hooks/use_experimental_features';
import { useKibana } from '../../../hooks/use_kibana';
import { useUiPrivileges } from '../../../hooks/use_ui_privileges';
import { useHasConnectorsAllPrivileges } from '../../../hooks/use_has_connectors_all_privileges';
import { useCurrentUser } from '../../../hooks/agents/use_current_user';
import { useNavigation } from '../../../hooks/use_navigation';
import { useToasts } from '../../../hooks/use_toasts';
import { queryKeys } from '../../../query_keys';
import { appPaths } from '../../../utils/app_paths';
import { labels } from '../../../utils/i18n';
import { storageKeys } from '../../../storage_keys';
import { AgentHeader } from './agent_header';
import { CapabilitiesSection } from './capabilities_section';
import { EditDetailsFlyout } from './edit_details_flyout';
import { SettingsSection } from './settings_section';
import { TurnOffCapabilitiesModal } from './turn_off_capabilities_modal';

const { agentOverview: overviewLabels } = labels;

export const AgentOverview: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { euiTheme } = useEuiTheme();
  const { agentService, docLinksService } = useAgentBuilderServices();
  const { addSuccessToast, addErrorToast } = useToasts();
  const queryClient = useQueryClient();
  const { navigateToAgentBuilderUrl } = useNavigation();

  const isExperimentalFeaturesEnabled = useExperimentalFeatures();
  const {
    services: { uiSettings },
  } = useKibana();
  const isConnectorsEnabled = uiSettings.get<boolean>(
    AGENT_BUILDER_CONNECTORS_ENABLED_SETTING_ID,
    false
  );

  const { manageAgents, isAdmin } = useUiPrivileges();
  const hasConnectorsPrivileges = useHasConnectorsAllPrivileges();
  const { currentUser } = useCurrentUser({ enabled: isExperimentalFeaturesEnabled });

  const { agent, isLoading } = useAgentBuilderAgentById(agentId);
  const { skills: allSkills } = useSkillsService();
  const { plugins: allPlugins } = usePluginsService();

  const [isEditFlyoutOpen, setIsEditFlyoutOpen] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [instructions, setInstructions] = useState<string | undefined>(undefined);

  const [warningDismissed, setWarningDismissed] = useLocalStorage(
    storageKeys.autoIncludeWarningDismissed,
    false
  );

  const canEditAgent = useMemo(() => {
    if (!manageAgents || !agent) return false;
    if (!isExperimentalFeaturesEnabled) return true;
    return hasAgentWriteAccess({
      visibility: agent.visibility,
      owner: agent.created_by,
      currentUser: currentUser ?? undefined,
      isAdmin,
    });
  }, [manageAgents, agent, isExperimentalFeaturesEnabled, currentUser, isAdmin]);

  const currentInstructions = instructions ?? agent?.configuration?.instructions ?? '';
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
  const connectorsCount = 0;

  const updateAgentMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => agentService.update(agentId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.byId(agentId) });
    },
  });

  const handleToggleAutoInclude = useCallback(
    (checked: boolean) => {
      if (!checked && !warningDismissed) {
        setIsModalVisible(true);
        return;
      }
      updateAgentMutation.mutate(
        { configuration: { enable_elastic_capabilities: checked } },
        {
          onSuccess: () => {
            addSuccessToast({
              title: checked
                ? overviewLabels.autoIncludeEnabledToast
                : overviewLabels.autoIncludeDisabledToast,
            });
          },
          onError: () => {
            addErrorToast({ title: overviewLabels.autoIncludeErrorToast });
          },
        }
      );
    },
    [warningDismissed, updateAgentMutation, addSuccessToast, addErrorToast]
  );

  const handleConfirmTurnOff = useCallback(
    (dontShowAgain: boolean) => {
      if (dontShowAgain) {
        setWarningDismissed(true);
      }
      setIsModalVisible(false);
      updateAgentMutation.mutate(
        { configuration: { enable_elastic_capabilities: false } },
        {
          onSuccess: () => {
            addSuccessToast({ title: overviewLabels.autoIncludeDisabledToast });
          },
          onError: () => {
            addErrorToast({ title: overviewLabels.autoIncludeErrorToast });
          },
        }
      );
    },
    [updateAgentMutation, setWarningDismissed, addSuccessToast, addErrorToast]
  );

  const handleSaveInstructions = useCallback(() => {
    updateAgentMutation.mutate(
      { configuration: { instructions: currentInstructions } },
      {
        onSuccess: () => {
          addSuccessToast({ title: overviewLabels.instructionsSavedToast });
        },
        onError: () => {
          addErrorToast({ title: overviewLabels.instructionsErrorToast });
        },
      }
    );
  }, [updateAgentMutation, currentInstructions, addSuccessToast, addErrorToast]);

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
        connectorsCount={connectorsCount}
        enableElasticCapabilities={enableElasticCapabilities}
        isExperimentalFeaturesEnabled={isExperimentalFeaturesEnabled}
        isConnectorsEnabled={isConnectorsEnabled}
        hasConnectorsPrivileges={hasConnectorsPrivileges}
        onNavigateToSkills={() =>
          navigateToAgentBuilderUrl(appPaths.agent.skills({ agentId: agentId! }))
        }
        onNavigateToPlugins={() =>
          navigateToAgentBuilderUrl(appPaths.agent.plugins({ agentId: agentId! }))
        }
        onNavigateToConnectors={() =>
          navigateToAgentBuilderUrl(appPaths.agent.connectors({ agentId: agentId! }))
        }
      />

      <EuiSpacer size="xl" />
      <EuiHorizontalRule margin="none" />
      <EuiSpacer size="xl" />

      <SettingsSection
        enableElasticCapabilities={enableElasticCapabilities}
        currentInstructions={currentInstructions}
        canEditAgent={canEditAgent}
        isLoading={updateAgentMutation.isLoading}
        onToggleAutoInclude={handleToggleAutoInclude}
        onInstructionsChange={setInstructions}
        onSaveInstructions={handleSaveInstructions}
      />

      {isEditFlyoutOpen && agent && (
        <EditDetailsFlyout agent={agent} onClose={() => setIsEditFlyoutOpen(false)} />
      )}

      {isModalVisible && (
        <TurnOffCapabilitiesModal
          onConfirm={handleConfirmTurnOff}
          onCancel={() => setIsModalVisible(false)}
        />
      )}
    </div>
  );
};

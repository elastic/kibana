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
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { hasAgentWriteAccess } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_CONNECTORS_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useAgentBuilderAgentById } from '../../../hooks/agents/use_agent_by_id';
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
import { storageKeys } from '../../../storage_keys';
import { AgentAvatar } from '../../common/agent_avatar';
import { AgentVisibilityBadge } from '../list/agent_visibility_badge';
import { CapabilityRow } from './capability_row';
import { EditDetailsFlyout } from './edit_details_flyout';
import { TurnOffCapabilitiesModal } from './turn_off_capabilities_modal';

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

  const skillsCount = agent?.configuration?.skill_ids?.length ?? 0;
  const pluginsCount = agent?.configuration?.plugin_ids?.length ?? 0;
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
                ? i18n.translate('xpack.agentBuilder.overview.autoInclude.enabledToast', {
                    defaultMessage: 'Built-in capabilities enabled',
                  })
                : i18n.translate('xpack.agentBuilder.overview.autoInclude.disabledToast', {
                    defaultMessage: 'Built-in capabilities disabled',
                  }),
            });
          },
          onError: () => {
            addErrorToast({
              title: i18n.translate('xpack.agentBuilder.overview.autoInclude.errorToast', {
                defaultMessage: 'Unable to update capabilities setting',
              }),
            });
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
            addSuccessToast({
              title: i18n.translate('xpack.agentBuilder.overview.autoInclude.disabledToast', {
                defaultMessage: 'Built-in capabilities disabled',
              }),
            });
          },
          onError: () => {
            addErrorToast({
              title: i18n.translate('xpack.agentBuilder.overview.autoInclude.errorToast', {
                defaultMessage: 'Unable to update capabilities setting',
              }),
            });
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
          addSuccessToast({
            title: i18n.translate('xpack.agentBuilder.overview.instructions.savedToast', {
              defaultMessage: 'Instructions saved',
            }),
          });
        },
        onError: () => {
          addErrorToast({
            title: i18n.translate('xpack.agentBuilder.overview.instructions.errorToast', {
              defaultMessage: 'Unable to save instructions',
            }),
          });
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
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <AgentAvatar agent={agent} size="xl" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiTitle size="l">
              <h1>{agent.name}</h1>
            </EuiTitle>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
              {agent.created_by?.username && (
                <EuiText size="s" color="subdued">
                  {i18n.translate('xpack.agentBuilder.overview.byAuthor', {
                    defaultMessage: 'By {author}',
                    values: { author: agent.created_by.username },
                  })}
                </EuiText>
              )}
              <EuiCopy textToCopy={agent.id}>
                {(copy) => (
                  <EuiButtonEmpty
                    size="xs"
                    iconType="copy"
                    onClick={copy}
                    flush="left"
                    data-test-subj="agentOverviewCopyId"
                  >
                    {i18n.translate('xpack.agentBuilder.overview.agentId', {
                      defaultMessage: 'ID {id}',
                      values: { id: agent.id },
                    })}
                  </EuiButtonEmpty>
                )}
              </EuiCopy>
              <AgentVisibilityBadge agent={agent} />
            </EuiFlexGroup>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            {docLinksService.agentBuilderAgents && (
              <EuiButtonEmpty
                href={docLinksService.agentBuilderAgents}
                target="_blank"
                iconType="documents"
                size="s"
                data-test-subj="agentOverviewDocsLink"
              >
                {i18n.translate('xpack.agentBuilder.overview.docsLink', {
                  defaultMessage: 'Docs',
                })}
              </EuiButtonEmpty>
            )}
            {canEditAgent && (
              <EuiButtonEmpty
                iconType="pencil"
                size="s"
                onClick={() => setIsEditFlyoutOpen(true)}
                data-test-subj="agentOverviewEditDetailsButton"
              >
                {i18n.translate('xpack.agentBuilder.overview.editDetailsButton', {
                  defaultMessage: 'Edit details',
                })}
              </EuiButtonEmpty>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        {agent.description}
      </EuiText>

      {agent.labels && agent.labels.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
            {agent.labels.map((label) => (
              <EuiBadge key={label} color="hollow">
                {label}
              </EuiBadge>
            ))}
          </EuiFlexGroup>
        </>
      )}

      <EuiSpacer size="xl" />
      <EuiHorizontalRule margin="none" />
      <EuiSpacer size="xl" />

      <EuiFlexGroup gutterSize="xl" alignItems="flexStart">
        <EuiFlexItem grow={1}>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.agentBuilder.overview.capabilities.title', {
                defaultMessage: 'Capabilities',
              })}
            </h2>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.agentBuilder.overview.capabilities.description', {
              defaultMessage:
                'Manage the capabilities this agent uses to perform tasks and activities.',
            })}
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={2}>
          <EuiFlexGroup direction="column" gutterSize="l">
            {isExperimentalFeaturesEnabled && (
              <CapabilityRow
                count={skillsCount}
                label={i18n.translate('xpack.agentBuilder.overview.capabilities.skills', {
                  defaultMessage: '{count, plural, one {Skill} other {Skills}}',
                  values: { count: skillsCount },
                })}
                description={i18n.translate(
                  'xpack.agentBuilder.overview.capabilities.skillsDescription',
                  {
                    defaultMessage:
                      'Combine prompts and tools into reusable logic your agent can invoke.',
                  }
                )}
                actionLabel={
                  enableElasticCapabilities
                    ? i18n.translate('xpack.agentBuilder.overview.capabilities.addSkill', {
                        defaultMessage: 'Add a skill',
                      })
                    : i18n.translate('xpack.agentBuilder.overview.capabilities.customizeSkills', {
                        defaultMessage: 'Customize',
                      })
                }
                onAction={() =>
                  navigateToAgentBuilderUrl(appPaths.agent.skills({ agentId: agentId! }))
                }
              />
            )}

            {isExperimentalFeaturesEnabled && (
              <CapabilityRow
                count={pluginsCount}
                label={i18n.translate('xpack.agentBuilder.overview.capabilities.plugins', {
                  defaultMessage: '{count, plural, one {Plugin} other {Plugins}}',
                  values: { count: pluginsCount },
                })}
                description={i18n.translate(
                  'xpack.agentBuilder.overview.capabilities.pluginsDescription',
                  {
                    defaultMessage:
                      'Add packaged sets of skills from external sources to quickly extend your agent.',
                  }
                )}
                actionLabel={
                  enableElasticCapabilities
                    ? i18n.translate('xpack.agentBuilder.overview.capabilities.addPlugin', {
                        defaultMessage: 'Add a plugin',
                      })
                    : i18n.translate('xpack.agentBuilder.overview.capabilities.customizePlugins', {
                        defaultMessage: 'Customize',
                      })
                }
                onAction={() =>
                  navigateToAgentBuilderUrl(appPaths.agent.plugins({ agentId: agentId! }))
                }
              />
            )}

            {isConnectorsEnabled && (
              <CapabilityRow
                count={connectorsCount}
                label={i18n.translate('xpack.agentBuilder.overview.capabilities.connectors', {
                  defaultMessage: '{count, plural, one {Connector} other {Connectors}}',
                  values: { count: connectorsCount },
                })}
                description={i18n.translate(
                  'xpack.agentBuilder.overview.capabilities.connectorsDescription',
                  {
                    defaultMessage:
                      'Connect external services to give your agent access to data and actions.',
                  }
                )}
                actionLabel={i18n.translate(
                  'xpack.agentBuilder.overview.capabilities.addConnector',
                  { defaultMessage: 'Add a connector' }
                )}
                onAction={
                  hasConnectorsPrivileges
                    ? () =>
                        navigateToAgentBuilderUrl(appPaths.agent.connectors({ agentId: agentId! }))
                    : undefined
                }
              />
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xl" />
      <EuiHorizontalRule margin="none" />
      <EuiSpacer size="xl" />

      <EuiFlexGroup gutterSize="xl" alignItems="flexStart">
        <EuiFlexItem grow={1}>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.agentBuilder.overview.settings.title', {
                defaultMessage: 'Settings',
              })}
            </h2>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.agentBuilder.overview.settings.description', {
              defaultMessage:
                'Configure how this agent behaves and how its capabilities are managed.',
            })}
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={2}>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow>
              <EuiTitle size="xs">
                <h3>
                  {i18n.translate('xpack.agentBuilder.overview.settings.autoIncludeTitle', {
                    defaultMessage: 'Include built-in capabilities automatically',
                  })}
                </h3>
              </EuiTitle>
              <EuiSpacer size="xs" />
              <EuiText size="s" color="subdued">
                {i18n.translate('xpack.agentBuilder.overview.settings.autoIncludeDescription', {
                  defaultMessage:
                    'Automatically include all current and future Elastic-built skills, plugins, and tools. Turn off to manage them manually.',
                })}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label={i18n.translate('xpack.agentBuilder.overview.settings.autoIncludeLabel', {
                  defaultMessage: 'Include built-in capabilities automatically',
                })}
                showLabel={false}
                checked={enableElasticCapabilities}
                onChange={(e) => handleToggleAutoInclude(e.target.checked)}
                disabled={!canEditAgent || updateAgentMutation.isLoading}
                data-test-subj="agentOverviewAutoIncludeSwitch"
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="xl" />

          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.agentBuilder.overview.settings.instructionsTitle', {
                defaultMessage: 'Use custom instructions',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.agentBuilder.overview.settings.instructionsDescription', {
              defaultMessage:
                'Define how the agent should behave, what it should prioritize, and any rules it should follow when responding.',
            })}
          </EuiText>
          <EuiSpacer size="m" />
          <EuiTextArea
            fullWidth
            rows={6}
            placeholder={i18n.translate(
              'xpack.agentBuilder.overview.settings.instructionsPlaceholder',
              { defaultMessage: 'No custom instructions.' }
            )}
            value={currentInstructions}
            onChange={(e) => setInstructions(e.target.value)}
            disabled={!canEditAgent}
            data-test-subj="agentOverviewInstructionsInput"
          />
          <EuiSpacer size="m" />
          {canEditAgent && (
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiButton
                size="s"
                iconType="save"
                onClick={handleSaveInstructions}
                isLoading={updateAgentMutation.isLoading}
                data-test-subj="agentOverviewSaveInstructionsButton"
              >
                {i18n.translate('xpack.agentBuilder.overview.settings.saveInstructionsButton', {
                  defaultMessage: 'Save instructions',
                })}
              </EuiButton>
            </EuiFlexGroup>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>

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

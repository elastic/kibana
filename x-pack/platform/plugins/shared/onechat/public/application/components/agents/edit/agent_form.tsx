/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiForm,
  EuiButton,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiContextMenu,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiTabbedContent,
  EuiButtonIcon,
} from '@elastic/eui';
import { useForm, FormProvider } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import type { AgentDefinition } from '@kbn/onechat-common';
import { formatOnechatErrorMessage } from '@kbn/onechat-browser';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { useAgentEdit } from '../../../hooks/agents/use_agent_edit';
import { useKibana } from '../../../hooks/use_kibana';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';
import { useAgentDelete } from '../../../hooks/agents/use_agent_delete';
import { AgentSettingsTab } from './tabs/settings_tab';
import { ToolsTab } from './tabs/tools_tab';
import { labels } from '../../../utils/i18n';
import { AgentAvatar } from '../agent_avatar';
import { isValidAgentAvatarColor } from '../../../utils/color';

export interface AgentFormProps {
  agentId?: string;
}

export type AgentFormData = Omit<AgentDefinition, 'type'>;

export const AgentForm: React.FC<AgentFormProps> = ({ agentId }) => {
  const { navigateToOnechatUrl } = useNavigation();
  const {
    services: { notifications },
  } = useKibana();

  const isCreateMode = !agentId;

  const onSaveSuccess = (agent: AgentDefinition) => {
    notifications.toasts.addSuccess(
      isCreateMode
        ? i18n.translate('xpack.onechat.agents.createSuccessMessage', {
            defaultMessage: 'Agent created successfully',
          })
        : i18n.translate('xpack.onechat.agents.updateSuccessMessage', {
            defaultMessage: 'Agent updated successfully',
          })
    );

    navigateToOnechatUrl(appPaths.agents.list);
  };

  const onSaveError = (err: Error) => {
    const errorMessageTitle = isCreateMode
      ? i18n.translate('xpack.onechat.agents.createErrorMessage', {
          defaultMessage: 'Failed to create agent',
        })
      : i18n.translate('xpack.onechat.agents.updateErrorMessage', {
          defaultMessage: 'Failed to update agent',
        });

    notifications.toasts.addDanger({
      title: errorMessageTitle,
      text: formatOnechatErrorMessage(err),
    });
  };

  const { deleteAgent, isDeleting } = useAgentDelete({
    onSuccess: () => {
      notifications.toasts.addSuccess(
        i18n.translate('xpack.onechat.agents.deleteSuccessMessage', {
          defaultMessage: 'Agent deleted successfully',
        })
      );
      navigateToOnechatUrl(appPaths.agents.list);
    },
    onError: (err: Error) => {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.onechat.agents.deleteErrorMessage', {
          defaultMessage: 'Failed to delete agent',
        }),
        text: formatOnechatErrorMessage(err),
      });
    },
  });

  const {
    state: agentState,
    isLoading,
    isSubmitting,
    submit,
    tools,
    error,
  } = useAgentEdit({
    agentId,
    onSaveSuccess,
    onSaveError,
  });

  const formMethods = useForm<AgentFormData>({
    defaultValues: { ...agentState },
    mode: 'onChange',
  });
  const { control, handleSubmit, reset, formState, watch } = formMethods;

  useEffect(() => {
    if (agentState && !isLoading) {
      reset(agentState);
    }
  }, [agentState, isLoading, reset]);

  const onSubmit = (data: AgentFormData) => {
    submit(data);
  };

  const isFormDisabled = isLoading || isSubmitting || isDeleting;

  const [isPopoverOpen, setPopoverOpen] = useState(false);

  const tabs = useMemo(
    () => [
      {
        id: 'settings',
        name: i18n.translate('xpack.onechat.agents.form.settingsTab', {
          defaultMessage: 'Settings',
        }),
        content: (
          <AgentSettingsTab
            control={control}
            formState={formState}
            isCreateMode={isCreateMode}
            isFormDisabled={isFormDisabled}
          />
        ),
      },
      {
        id: 'tools',
        name: i18n.translate('xpack.onechat.agents.form.toolsTab', {
          defaultMessage: 'Tools',
        }),
        content: (
          <ToolsTab
            control={control}
            tools={tools}
            isLoading={isLoading}
            isFormDisabled={isFormDisabled}
          />
        ),
      },
    ],
    [control, formState, isCreateMode, isFormDisabled, tools, isLoading]
  );

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: '200px' }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (error) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.onechat.agents.errorTitle', {
          defaultMessage: 'Error loading agent',
        })}
        color="danger"
        iconType="error"
      >
        <p>
          {i18n.translate('xpack.onechat.agents.errorMessage', {
            defaultMessage: 'Unable to load the agent. {errorMessage}',
            values: {
              errorMessage: (error as Error)?.message || String(error),
            },
          })}
        </p>
        <EuiSpacer size="m" />
        <EuiButton onClick={() => navigateToOnechatUrl(appPaths.agents.list)}>
          {i18n.translate('xpack.onechat.agents.backToListButton', {
            defaultMessage: 'Back to agents list',
          })}
        </EuiButton>
      </EuiCallOut>
    );
  }

  const agentName = watch('name');
  const agentDescription = watch('description');
  const agentAvatarSymbol = watch('avatar_symbol');
  const watchedAvatarColor = watch('avatar_color');
  const agentAvatarColor =
    watchedAvatarColor && isValidAgentAvatarColor(watchedAvatarColor)
      ? watchedAvatarColor
      : undefined;

  return (
    <KibanaPageTemplate panelled bottomBorder={false}>
      <KibanaPageTemplate.Header
        pageTitle={
          <EuiFlexGroup alignItems="center" gutterSize="m">
            {!isCreateMode && (
              <EuiFlexItem grow={false}>
                <AgentAvatar
                  size="xl"
                  agent={{
                    name: agentName,
                    avatar_symbol: agentAvatarSymbol,
                    avatar_color: agentAvatarColor,
                  }}
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem>{isCreateMode ? labels.agents.newAgent : agentName}</EuiFlexItem>
          </EuiFlexGroup>
        }
        description={
          isCreateMode
            ? i18n.translate('xpack.onechat.createAgent.description', {
                defaultMessage: 'Create an AI agent, select tools and provide custom instructions.',
              })
            : agentDescription
        }
        rightSideItems={[
          ...(!isCreateMode
            ? [
                <EuiPopover
                  button={
                    <EuiButtonIcon
                      size="m"
                      aria-label={i18n.translate('xpack.onechat.agents.form.openMenuLabel', {
                        defaultMessage: 'Open menu',
                      })}
                      iconType="boxesVertical"
                      onClick={() => setPopoverOpen(!isPopoverOpen)}
                    />
                  }
                  isOpen={isPopoverOpen}
                  closePopover={() => setPopoverOpen(false)}
                  anchorPosition="downLeft"
                  panelPaddingSize="none"
                >
                  <EuiContextMenu
                    initialPanelId={0}
                    panels={[
                      {
                        id: 0,
                        items: [
                          {
                            name: i18n.translate('xpack.onechat.agents.form.deleteButton', {
                              defaultMessage: 'Delete agent',
                            }),
                            icon: 'trash',
                            onClick: () => {
                              deleteAgent(agentId!);
                            },
                          },
                        ],
                      },
                    ]}
                  />
                </EuiPopover>,
              ]
            : []),
          <EuiButton
            type="submit"
            onClick={handleSubmit(onSubmit)}
            fill
            iconType="save"
            isLoading={isSubmitting}
            disabled={isFormDisabled || !formState.isValid}
          >
            {i18n.translate('xpack.onechat.agents.form.saveButton', {
              defaultMessage: 'Save',
            })}
          </EuiButton>,
          ...(!isCreateMode
            ? [
                <EuiButton
                  onClick={() =>
                    navigateToOnechatUrl(appPaths.chat.newWithAgent({ agentId: agentId! }))
                  }
                  iconType="comment"
                  isLoading={isSubmitting}
                  disabled={isFormDisabled || !formState.isValid}
                >
                  {i18n.translate('xpack.onechat.agents.form.chatButton', {
                    defaultMessage: 'Chat',
                  })}
                </EuiButton>,
              ]
            : []),
        ]}
      />
      <KibanaPageTemplate.Section>
        <FormProvider {...formMethods}>
          <EuiForm component="form" onSubmit={handleSubmit(onSubmit)} fullWidth>
            <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} />
          </EuiForm>
        </FormProvider>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};

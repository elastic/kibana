/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiTextArea,
  EuiButton,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiTabbedContent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AgentDefinition } from '@kbn/onechat-common';
import { formatOnechatErrorMessage } from '@kbn/onechat-browser';
import { useForm, Controller, FormProvider } from 'react-hook-form';
import { useAgentEdit } from '../../../hooks/agents/use_agent_edit';
import { useKibana } from '../../../hooks/use_kibana';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';
import { useAgentDelete } from '../../../hooks/agents/use_agent_delete';
import { AgentSettingsTab } from './tabs/settings_tab.tsx';
import { ToolsTab } from './tabs/tools_tab.tsx';

export interface AgentFormProps {
  agentId?: string;
}

type AgentFormData = Omit<AgentDefinition, 'type'>;

export const AgentForm: React.FC<AgentFormProps> = ({ agentId }) => {
  const { navigateToOnechatUrl } = useNavigation();
  const {
    services: { notifications },
  } = useKibana();

  const isCreateMode = !agentId;

  const onSaveSuccess = () => {
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
  const { control, handleSubmit, reset, formState } = formMethods;

  useEffect(() => {
    if (agentState && !isLoading) {
      reset(agentState);
    }
  }, [agentState, isLoading, reset]);

  const onSubmit = (data: AgentFormData) => {
    submit(data);
  };

  const isFormDisabled = isLoading || isSubmitting || isDeleting;

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
            isDisabled={isFormDisabled}
            tools={tools}
            toolsLoading={isLoading}
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

  return (
    <FormProvider {...formMethods}>
      <EuiForm component="form" onSubmit={handleSubmit(onSubmit)}>
        <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} />

        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButton
                  type="submit"
                  fill
                  iconType="save"
                  isLoading={isSubmitting}
                  disabled={isFormDisabled || !formState.isValid}
                >
                  {isCreateMode
                    ? i18n.translate('xpack.onechat.agents.form.createButton', {
                        defaultMessage: 'Create Agent',
                      })
                    : i18n.translate('xpack.onechat.agents.form.saveButton', {
                        defaultMessage: 'Save Changes',
                      })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={() => navigateToOnechatUrl(appPaths.agents.list)}
                  disabled={isFormDisabled}
                >
                  {i18n.translate('xpack.onechat.agents.form.cancelButton', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {!isCreateMode && (
            <EuiFlexItem grow={false}>
              <EuiButton
                color="danger"
                iconType="trash"
                onClick={() => deleteAgent(agentId!)}
                disabled={isFormDisabled}
                isLoading={isDeleting}
              >
                {i18n.translate('xpack.onechat.agents.form.deleteButton', {
                  defaultMessage: 'Delete',
                })}
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiForm>
    </FormProvider>
  );
};

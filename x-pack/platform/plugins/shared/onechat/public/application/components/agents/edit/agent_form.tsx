/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AgentDefinition } from '@kbn/onechat-common';
import { useForm, Controller, FormProvider } from 'react-hook-form';
import { useAgentEdit } from '../../../hooks/agents/use_agent_edit';
import { useKibana } from '../../../hooks/use_kibana';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';
import { useAgentDelete } from '../../../hooks/agents/use_agent_delete';
import { ToolsSelection } from './tools_selection';

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
    const errorMessage = isCreateMode
      ? i18n.translate('xpack.onechat.agents.createErrorMessage', {
          defaultMessage: 'Failed to create agent',
        })
      : i18n.translate('xpack.onechat.agents.updateErrorMessage', {
          defaultMessage: 'Failed to update agent',
        });
    notifications.toasts.addError(err, {
      title: errorMessage,
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
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.onechat.agents.deleteErrorMessage', {
          defaultMessage: 'Failed to delete agent',
        }),
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

  const onSubmit = (data: AgentFormData) => {
    submit(data);
  };

  const isFormDisabled = isLoading || isSubmitting || isDeleting;

  return (
    <FormProvider {...formMethods}>
      <EuiForm component="form" onSubmit={handleSubmit(onSubmit)}>
        <EuiFormRow
          label={i18n.translate('xpack.onechat.agents.form.idLabel', {
            defaultMessage: 'Agent ID',
          })}
          isInvalid={!!formState.errors.id}
          error={formState.errors.id?.message}
        >
          <Controller
            name="id"
            control={control}
            rules={{
              required: i18n.translate('xpack.onechat.agents.form.idRequired', {
                defaultMessage: 'Agent ID is required',
              }),
            }}
            render={({ field }) => (
              <EuiFieldText
                {...field}
                disabled={isFormDisabled || !isCreateMode}
                placeholder={
                  isCreateMode
                    ? i18n.translate('xpack.onechat.agents.form.idPlaceholder', {
                        defaultMessage: 'Enter agent ID',
                      })
                    : ''
                }
                isInvalid={!!formState.errors.id}
              />
            )}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.onechat.agents.form.nameLabel', {
            defaultMessage: 'Agent Name',
          })}
          isInvalid={!!formState.errors.name}
          error={formState.errors.name?.message}
        >
          <Controller
            name="name"
            control={control}
            rules={{
              required: i18n.translate('xpack.onechat.agents.form.nameRequired', {
                defaultMessage: 'Agent name is required',
              }),
            }}
            render={({ field }) => (
              <EuiFieldText
                {...field}
                disabled={isFormDisabled}
                isInvalid={!!formState.errors.name}
              />
            )}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.onechat.agents.form.descriptionLabel', {
            defaultMessage: 'Description',
          })}
        >
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <EuiFieldText
                {...field}
                disabled={isFormDisabled}
                isInvalid={!!formState.errors.description}
              />
            )}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.onechat.agents.form.customInstructionsLabel', {
            defaultMessage: 'Custom Instructions',
          })}
        >
          <Controller
            name="configuration.instructions"
            control={control}
            render={({ field }) => (
              <EuiTextArea
                {...field}
                rows={4}
                disabled={isFormDisabled}
                isInvalid={!!formState.errors.configuration?.instructions}
              />
            )}
          />
        </EuiFormRow>

        <EuiSpacer size="l" />
        <EuiTitle size="m">
          <h4>
            {i18n.translate('xpack.onechat.agents.form.toolsSelectionTitle', {
              defaultMessage: 'Configure Agent Tools',
            })}
          </h4>
        </EuiTitle>
        <EuiSpacer size="l" />
        <Controller
          name="configuration.tools"
          control={control}
          render={({ field }) => (
            <ToolsSelection
              tools={tools}
              toolsLoading={isLoading}
              selectedTools={field.value}
              onToolsChange={field.onChange}
              disabled={isFormDisabled}
            />
          )}
        />

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

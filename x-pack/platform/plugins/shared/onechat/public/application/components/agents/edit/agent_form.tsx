/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiTextArea,
  EuiButton,
  EuiSpacer,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useForm, Controller, FormProvider } from 'react-hook-form';
import { useAgentEdit } from '../../../hooks/agents/use_agent_edit';
import { useKibana } from '../../../hooks/use_kibana';

export interface AgentFormProps {
  mode: 'create' | 'edit';
}

export const AgentForm: React.FC<AgentFormProps> = ({ mode }) => {
  const { agentId } = useParams<{ agentId: string }>();
  const history = useHistory();
  const {
    services: { notifications },
  } = useKibana();

  // Success/error handlers
  const onSaveSuccess = () => {
    notifications.toasts.addSuccess(
      i18n.translate('xpack.onechat.agents.createSuccessMessage', {
        defaultMessage: 'Agent created successfully',
      })
    );
    history.push('/agents');
  };
  const onSaveError = (err: Error) => {
    notifications.toasts.addError(err, {
      title: i18n.translate('xpack.onechat.agents.createErrorMessage', {
        defaultMessage: 'Failed to create agent',
      }),
    });
  };

  const { state, isLoading, isSubmitting, submit, toolsError } = useAgentEdit({
    agentId: mode === 'edit' ? agentId : undefined,
    onSaveSuccess,
    onSaveError,
  });

  const formMethods = useForm({
    defaultValues: { ...state },
  });
  const { control, handleSubmit, reset, formState } = formMethods;

  useEffect(() => {
    reset({ ...state });
  }, [state, reset]);

  // Error message helper
  const getErrorMessage = (err: unknown) => {
    if (!err) return undefined;
    if (typeof err === 'object' && 'message' in err) {
      return (err as Error).message;
    }
    return String(err);
  };

  const onSubmit = (data: any) => {
    submit(data);
  };

  // Compose error message
  const errorMessage =
    getErrorMessage(toolsError) ||
    (formState.errors.name && 'Name is required') ||
    (formState.errors.description && 'Description is required') ||
    (formState.errors.id && 'ID is required');

  return (
    <FormProvider {...formMethods}>
      <EuiForm component="form" onSubmit={handleSubmit(onSubmit)} isInvalid={!!errorMessage}>
        <EuiFormRow
          label="Agent ID"
          isInvalid={!!formState.errors.id}
          error={formState.errors.id && 'ID is required'}
        >
          <Controller
            name="id"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <EuiFieldText
                {...field}
                disabled={isLoading || isSubmitting || mode === 'edit'}
                placeholder={mode === 'create' ? 'Enter agent ID' : ''}
              />
            )}
          />
        </EuiFormRow>
        <EuiFormRow
          label="Agent Name"
          isInvalid={!!formState.errors.name}
          error={formState.errors.name && 'Name is required'}
        >
          <Controller
            name="name"
            control={control}
            rules={{ required: true }}
            render={({ field }) => <EuiFieldText {...field} disabled={isLoading || isSubmitting} />}
          />
        </EuiFormRow>
        <EuiFormRow label="Description">
          <Controller
            name="description"
            control={control}
            render={({ field }) => <EuiFieldText {...field} disabled={isLoading || isSubmitting} />}
          />
        </EuiFormRow>
        <EuiFormRow label="Extra Instructions">
          <Controller
            name="customInstructions"
            control={control}
            render={({ field }) => (
              <EuiTextArea {...field} rows={4} disabled={isLoading || isSubmitting} />
            )}
          />
        </EuiFormRow>
        {errorMessage && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut color="danger" title="Error">
              {errorMessage}
            </EuiCallOut>
          </>
        )}
        <EuiSpacer size="m" />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              type="submit"
              fill
              isLoading={isSubmitting}
              disabled={
                isLoading || isSubmitting || !formMethods.watch('name') || !formMethods.watch('id')
              }
            >
              {mode === 'create' ? 'Create Agent' : 'Save Changes'}
            </EuiButton>
          </EuiFlexItem>
          {mode === 'edit' && (
            <EuiFlexItem grow={false}>
              <EuiButton color="danger" onClick={() => {}} disabled={isSubmitting}>
                Delete
              </EuiButton>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiButton onClick={() => history.push('/agents')} disabled={isSubmitting}>
              Cancel
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
    </FormProvider>
  );
};

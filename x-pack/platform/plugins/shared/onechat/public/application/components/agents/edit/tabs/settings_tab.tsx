/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFormRow,
  EuiFieldText,
  EuiTextArea,
  EuiComboBox,
  EuiColorPicker,
  EuiTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller } from 'react-hook-form';

interface AgentSettingsTabProps {
  control: any;
  formState: any;
  isCreateMode: boolean;
  isFormDisabled: boolean;
}

export const AgentSettingsTab: React.FC<AgentSettingsTabProps> = ({
  control,
  formState,
  isCreateMode,
  isFormDisabled,
}) => {
  return (
    <>
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
          render={({ field: { ref, ...rest } }) => (
            <EuiFieldText
              {...rest}
              inputRef={ref}
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
          render={({ field: { ref, ...rest } }) => (
            <EuiFieldText
              {...rest}
              inputRef={ref}
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
          render={({ field: { ref, ...rest } }) => (
            <EuiFieldText
              {...rest}
              inputRef={ref}
              disabled={isFormDisabled}
              isInvalid={!!formState.errors.description}
            />
          )}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.onechat.agents.form.labelsLabel', {
          defaultMessage: 'Labels',
        })}
        helpText={i18n.translate('xpack.onechat.agents.form.labelsHelp', {
          defaultMessage: 'Add labels to organize and filter agents.',
        })}
      >
        <Controller
          name="labels"
          control={control}
          render={({ field }) => (
            <EuiComboBox
              placeholder={i18n.translate('xpack.onechat.agents.form.labelsPlaceholder', {
                defaultMessage: 'Add one or more labels',
              })}
              selectedOptions={(field.value || []).map((l: string) => ({ label: l }))}
              onCreateOption={(searchValue: string) => {
                const newLabel = searchValue.trim();
                if (!newLabel) return;
                const next = Array.from(new Set([...(field.value || []), newLabel]));
                field.onChange(next);
              }}
              onChange={(options) => field.onChange(options.map((o) => o.label))}
              isDisabled={isFormDisabled}
              isClearable
            />
          )}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.onechat.agents.form.agentColorLabel', {
          defaultMessage: 'Agent color',
        })}
      >
        <Controller
          name="agentColor"
          control={control}
          render={({ field }) => (
            <EuiColorPicker {...field} onChange={field.onChange} isDisabled={isFormDisabled} />
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
          render={({ field: { ref, ...rest } }) => (
            <EuiTextArea
              {...rest}
              inputRef={ref}
              rows={4}
              disabled={isFormDisabled}
              isInvalid={!!formState.errors.configuration?.instructions}
            />
          )}
        />
      </EuiFormRow>
    </>
  );
};

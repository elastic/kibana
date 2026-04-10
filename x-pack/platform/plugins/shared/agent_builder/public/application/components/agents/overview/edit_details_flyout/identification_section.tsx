/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiColorPicker,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { isValidAgentAvatarColor } from '../../../../utils/color';
import { truncateAvatarSymbol } from '../../edit/agent_form_validation';
import { labels } from '../../../../utils/i18n';
import type { EditDetailsFormData } from './types';

const { editDetails: flyoutLabels } = labels.agentOverview;

export const IdentificationSection: React.FC = () => {
  const { control, formState } = useFormContext<EditDetailsFormData>();

  return (
    <>
      <EuiTitle size="xs">
        <h3>{flyoutLabels.identificationTitle}</h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        {flyoutLabels.identificationDescription}
      </EuiText>
      <EuiSpacer size="m" />

      <EuiFormRow
        label={flyoutLabels.nameLabel}
        isInvalid={!!formState.errors.name}
        error={formState.errors.name?.message}
        fullWidth
      >
        <Controller
          name="name"
          control={control}
          rules={{ required: flyoutLabels.nameRequired }}
          render={({ field: { ref, ...rest } }) => (
            <EuiFieldText
              {...rest}
              inputRef={ref}
              isInvalid={!!formState.errors.name}
              data-test-subj="editDetailsNameInput"
              fullWidth
            />
          )}
        />
      </EuiFormRow>

      <EuiFormRow
        label={flyoutLabels.descriptionLabel}
        isInvalid={!!formState.errors.description}
        error={formState.errors.description?.message}
        fullWidth
      >
        <Controller
          name="description"
          control={control}
          rules={{ required: flyoutLabels.descriptionRequired }}
          render={({ field: { ref, ...rest } }) => (
            <EuiTextArea
              {...rest}
              inputRef={ref}
              rows={3}
              isInvalid={!!formState.errors.description}
              data-test-subj="editDetailsDescriptionInput"
              fullWidth
            />
          )}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="l" responsive={false}>
        <EuiFlexItem>
          <EuiFormRow
            label={flyoutLabels.avatarSymbolLabel}
            labelAppend={
              <EuiText size="xs" color="subdued">
                {labels.common.optional}
              </EuiText>
            }
            isInvalid={!!formState.errors.avatar_symbol}
            error={formState.errors.avatar_symbol?.message}
            fullWidth
          >
            <Controller
              name="avatar_symbol"
              control={control}
              render={({ field: { ref, ...rest } }) => (
                <EuiFieldText
                  {...rest}
                  onChange={(e) => rest.onChange(truncateAvatarSymbol(e.target.value))}
                  inputRef={ref}
                  placeholder={flyoutLabels.avatarSymbolPlaceholder}
                  data-test-subj="editDetailsAvatarSymbolInput"
                  fullWidth
                />
              )}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={flyoutLabels.avatarColorLabel}
            labelAppend={
              <EuiText size="xs" color="subdued">
                {labels.common.optional}
              </EuiText>
            }
            isInvalid={!!formState.errors.avatar_color}
            error={formState.errors.avatar_color?.message}
            fullWidth
          >
            <Controller
              name="avatar_color"
              control={control}
              rules={{
                validate: (value) => {
                  if (!value) return true;
                  return isValidAgentAvatarColor(value) || flyoutLabels.avatarColorInvalid;
                },
              }}
              render={({ field: { onChange, value } }) => (
                <EuiColorPicker
                  onChange={onChange}
                  color={value}
                  placeholder={flyoutLabels.avatarColorPlaceholder}
                  fullWidth
                  data-test-subj="editDetailsAvatarColorPicker"
                />
              )}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

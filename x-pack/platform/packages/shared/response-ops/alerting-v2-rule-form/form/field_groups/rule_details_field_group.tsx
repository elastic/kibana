/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFieldText, EuiComboBox, EuiSwitch } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';
import { FieldGroup } from './field_group';
import { DescriptionField } from '../fields/description_field';
import { KindField } from '../fields/kind_field';

const NAME_ROW_ID = 'ruleV2FormNameField';

export const RuleDetailsFieldGroup: React.FC = () => {
  const {
    control,
    formState: { errors },
  } = useFormContext<FormValues>();
  return (
    <FieldGroup
      title={i18n.translate('xpack.alertingV2.ruleForm.ruleDetails', {
        defaultMessage: 'Rule details',
      })}
    >
      <EuiFormRow
        id={NAME_ROW_ID}
        label={i18n.translate('xpack.alertingV2.ruleForm.nameLabel', {
          defaultMessage: 'Name',
        })}
        isInvalid={!!errors.name}
        error={errors.name?.message}
      >
        <Controller
          name="name"
          control={control}
          rules={{
            required: i18n.translate('xpack.alertingV2.ruleForm.nameRequiredError', {
              defaultMessage: 'Name is required.',
            }),
          }}
          render={({ field: { ref, ...field } }) => <EuiFieldText {...field} inputRef={ref} />}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.alertingV2.ruleForm.tagsLabel', {
          defaultMessage: 'Tags',
        })}
      >
        <Controller
          name="tags"
          control={control}
          render={({ field }) => {
            const selectedOptions = (field.value ?? []).map((val) => ({ label: val }));
            const options = selectedOptions;

            return (
              <EuiComboBox
                options={options}
                selectedOptions={selectedOptions}
                onChange={(selected) => field.onChange(selected.map(({ label }) => label))}
                onCreateOption={(searchValue) => {
                  field.onChange([...(field.value ?? []), searchValue]);
                }}
                isClearable={true}
              />
            );
          }}
        />
      </EuiFormRow>

      <DescriptionField />

      <EuiFormRow
        label={i18n.translate('xpack.alertingV2.ruleForm.enabledLabel', {
          defaultMessage: 'Enabled',
        })}
        helpText={i18n.translate('xpack.alertingV2.ruleForm.enabledHelpText', {
          defaultMessage: 'When enabled, the rule will run on the defined schedule.',
        })}
      >
        <Controller
          name="enabled"
          control={control}
          render={({ field: { value, onChange } }) => (
            <EuiSwitch
              label={
                value
                  ? i18n.translate('xpack.alertingV2.ruleForm.enabledOnLabel', {
                      defaultMessage: 'On',
                    })
                  : i18n.translate('xpack.alertingV2.ruleForm.enabledOffLabel', {
                      defaultMessage: 'Off',
                    })
              }
              checked={value ?? true}
              onChange={(e) => onChange(e.target.checked)}
            />
          )}
        />
      </EuiFormRow>
      <KindField />
    </FieldGroup>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiComboBox } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';
import { useRuleFormMeta } from '../contexts';
import { OPTIONAL_LABEL } from '../optional_field_label';
import { validateTags } from './tags_field';

const ROUTING_TAGS_LABEL = i18n.translate('xpack.alertingV2.ruleForm.routingTagsLabel', {
  defaultMessage: 'Routing tags',
});

export const RoutingTagsField = () => {
  const { control } = useFormContext<FormValues>();
  const { layout } = useRuleFormMeta();

  return (
    <Controller
      name="metadata.routingTags"
      control={control}
      rules={{ validate: validateTags }}
      render={({ field, fieldState: { error } }) => {
        const selectedOptions = (field.value ?? []).map((val) => ({ label: val }));

        return (
          <EuiFormRow
            label={ROUTING_TAGS_LABEL}
            labelAppend={OPTIONAL_LABEL}
            helpText={i18n.translate('xpack.alertingV2.ruleForm.routingTagsHelpText', {
              defaultMessage:
                'Action policies apply when they share at least one of these routing tags.',
            })}
            isInvalid={!!error}
            error={error?.message}
            fullWidth
          >
            <EuiComboBox
              aria-label={ROUTING_TAGS_LABEL}
              placeholder={i18n.translate('xpack.alertingV2.ruleForm.routingTagsPlaceholder', {
                defaultMessage: 'Add routing tags to link action policies',
              })}
              customOptionText={i18n.translate(
                'xpack.alertingV2.ruleForm.routingTagsCustomOptionText',
                { defaultMessage: 'Add {searchValue} as a routing tag' }
              )}
              data-test-subj="ruleRoutingTagsInput"
              options={[]}
              noSuggestions={false}
              selectedOptions={selectedOptions}
              onBlur={field.onBlur}
              onChange={(selected) => field.onChange(selected.map(({ label }) => label))}
              onCreateOption={(searchValue) => {
                const trimmed = searchValue.trim();
                if (trimmed.length > 0 && !(field.value ?? []).includes(trimmed)) {
                  field.onChange([...(field.value ?? []), trimmed]);
                }
              }}
              isClearable={true}
              isInvalid={!!error}
              fullWidth
              compressed={layout === 'flyout'}
            />
          </EuiFormRow>
        );
      }}
    />
  );
};

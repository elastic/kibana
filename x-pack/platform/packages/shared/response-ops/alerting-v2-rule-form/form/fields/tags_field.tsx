/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiComboBox } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { useDebouncedValue } from '@kbn/react-hooks';
import { MAX_TAG_LENGTH, MAX_TAGS } from '@kbn/alerting-v2-constants';
import type { FormValues } from '../types';
import { useRuleFormMeta, useRuleFormServices } from '../contexts';
import { useFetchRuleTags } from '../hooks/use_fetch_rule_tags';

export const validateTags = (value?: string[]): true | string => {
  if (value?.some((tag) => tag.length > MAX_TAG_LENGTH)) {
    return i18n.translate('xpack.alertingV2.ruleForm.tagTooLongError', {
      defaultMessage: 'Each tag must be no longer than {maxLength} characters.',
      values: { maxLength: MAX_TAG_LENGTH },
    });
  }
  if (value && value.length > MAX_TAGS) {
    return i18n.translate('xpack.alertingV2.ruleForm.tooManyTagsError', {
      defaultMessage: 'You can add up to {maxTags} tags.',
      values: { maxTags: MAX_TAGS },
    });
  }
  return true;
};

export const TagsField = () => {
  const { control } = useFormContext<FormValues>();
  const { layout } = useRuleFormMeta();
  const { http } = useRuleFormServices();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 200);
  const { data: existingTags, isLoading } = useFetchRuleTags({
    http,
    search: debouncedQuery,
  });
  const tagOptions = (existingTags ?? []).map((tag: string) => ({ label: tag }));

  return (
    <Controller
      name="metadata.tags"
      control={control}
      rules={{ validate: validateTags }}
      render={({ field, fieldState: { error } }) => {
        const selectedOptions = (field.value ?? []).map((val) => ({ label: val }));

        return (
          <EuiFormRow
            label={i18n.translate('xpack.alertingV2.ruleForm.tagsLabel', {
              defaultMessage: 'Tags',
            })}
            labelAppend={i18n.translate('xpack.alertingV2.ruleForm.tagsOptional', {
              defaultMessage: 'optional',
            })}
            isInvalid={!!error}
            error={error?.message}
            fullWidth
          >
            <EuiComboBox
              aria-label={i18n.translate('xpack.alertingV2.ruleForm.tagsAriaLabel', {
                defaultMessage: 'Tags',
              })}
              placeholder={i18n.translate('xpack.alertingV2.ruleForm.tagsPlaceholder', {
                defaultMessage: 'Add tags to organize and filter rules',
              })}
              data-test-subj="ruleTagsInput"
              async
              isLoading={isLoading}
              options={tagOptions}
              selectedOptions={selectedOptions}
              onSearchChange={setSearchQuery}
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

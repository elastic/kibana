/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiComboBox, useEuiTheme } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { useDebouncedValue } from '@kbn/react-hooks';
import type { ActionPolicyRoutingTagItem } from '@kbn/alerting-v2-schemas';
import type { FormValues } from '../types';
import { useRuleFormMeta, useRuleFormServices } from '../contexts';
import { useFetchActionPolicyRoutingTags } from '../hooks/use_fetch_action_policy_routing_tags';
import { OPTIONAL_LABEL } from '../optional_field_label';
import { validateTags } from './tags_field';
import {
  buildRoutingTagOption,
  renderRoutingTagOption,
  type RoutingTagOption,
} from './routing_tag_suggestion';

const ROUTING_TAGS_LABEL = i18n.translate('xpack.alertingV2.ruleForm.routingTagsLabel', {
  defaultMessage: 'Routing tags',
});

const SUGGESTION_ROW_HEIGHT_MULTIPLIER = 3;

export const RoutingTagsField = () => {
  const { control } = useFormContext<FormValues>();
  const { layout } = useRuleFormMeta();
  const { http } = useRuleFormServices();
  const { euiTheme } = useEuiTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 200);
  const { data, isLoading } = useFetchActionPolicyRoutingTags({ http, search: debouncedQuery });

  const suggestionOptions = (data?.items ?? []).map(buildRoutingTagOption);

  return (
    <Controller
      name="metadata.routingTags"
      control={control}
      rules={{ validate: validateTags }}
      render={({ field, fieldState: { error } }) => {
        const selectedOptions: RoutingTagOption[] = (field.value ?? []).map((val) => ({
          label: val,
        }));

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
            <EuiComboBox<ActionPolicyRoutingTagItem>
              aria-label={ROUTING_TAGS_LABEL}
              placeholder={i18n.translate('xpack.alertingV2.ruleForm.routingTagsPlaceholder', {
                defaultMessage: 'Add routing tags to link action policies',
              })}
              customOptionText={i18n.translate(
                'xpack.alertingV2.ruleForm.routingTagsCustomOptionText',
                { defaultMessage: 'Add {searchValue} as a routing tag' }
              )}
              data-test-subj="ruleRoutingTagsInput"
              async
              isCaseSensitive
              isLoading={isLoading}
              options={suggestionOptions}
              renderOption={renderRoutingTagOption}
              rowHeight={euiTheme.base * SUGGESTION_ROW_HEIGHT_MULTIPLIER}
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

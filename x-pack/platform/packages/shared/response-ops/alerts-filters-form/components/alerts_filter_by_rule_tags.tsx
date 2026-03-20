/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxProps } from '@elastic/eui/src/components/combo_box/combo_box';
import { nodeBuilder, toKqlExpression } from '@kbn/es-query';
import { ALERT_RULE_TAGS } from '@kbn/rule-data-utils';
import { useGetRuleTagsQuery } from '@kbn/response-ops-rules-apis/hooks/use_get_rule_tags_query';
import { RULE_TAGS_FILTER_SUBJ } from '../constants';
import {
  RULE_TAGS_FILTER_LABEL,
  RULE_TAGS_FILTER_NO_OPTIONS_PLACEHOLDER,
  RULE_TAGS_FILTER_PLACEHOLDER,
  RULE_TAGS_LOAD_ERROR_MESSAGE,
} from '../translations';
import { useAlertsFiltersFormContext } from '../contexts/alerts_filters_form_context';
import type { AlertsFilterComponentType, AlertsFilterMetadata } from '../types';

export const AlertsFilterByRuleTags: AlertsFilterComponentType<string[]> = ({
  value,
  onChange,
  isDisabled: isDisabledProp = false,
  error,
}) => {
  const {
    ruleTypeIds,
    services: {
      http,
      notifications: { toasts },
    },
  } = useAlertsFiltersFormContext();

  const {
    tags,
    isLoading,
    isError: isErrorLoadingRuleTags,
  } = useGetRuleTagsQuery({
    enabled: true,
    perPage: 10000,
    // Only search tags from allowed rule type ids
    ruleTypeIds,
    http,
    toasts,
  });

  const options = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () =>
      tags.map((tag) => ({
        label: tag,
      })),
    [tags]
  );

  const selectedOptions = useMemo(
    () => options.filter(({ label }) => value?.includes(label)),
    [options, value]
  );

  const onSelectedOptionsChange = useCallback<NonNullable<EuiComboBoxProps<string>['onChange']>>(
    (newOptions) => {
      onChange?.(newOptions.map(({ label }) => label));
    },
    [onChange]
  );

  const isInvalid = Boolean(error) || isErrorLoadingRuleTags;
  const isDisabled = isDisabledProp || isErrorLoadingRuleTags || !options.length;

  return (
    <EuiFormRow
      label={RULE_TAGS_FILTER_LABEL}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      error={error ?? RULE_TAGS_LOAD_ERROR_MESSAGE}
      fullWidth
    >
      <EuiComboBox
        isClearable
        isLoading={isLoading}
        isDisabled={isDisabled}
        isInvalid={isInvalid}
        options={options}
        selectedOptions={selectedOptions}
        onChange={onSelectedOptionsChange}
        placeholder={
          !options.length ? RULE_TAGS_FILTER_NO_OPTIONS_PLACEHOLDER : RULE_TAGS_FILTER_PLACEHOLDER
        }
        fullWidth
        compressed
        data-test-subj={RULE_TAGS_FILTER_SUBJ}
      />
    </EuiFormRow>
  );
};

const isEmpty = (value?: string[]) => !Boolean(value?.length);

export const filterMetadata: AlertsFilterMetadata<string[]> = {
  id: 'ruleTags',
  displayName: RULE_TAGS_FILTER_LABEL,
  component: AlertsFilterByRuleTags,
  isEmpty,
  toKql: (value?: string[]) => {
    if (!value || isEmpty(value)) {
      return null;
    }
    return toKqlExpression(
      value.length === 1
        ? nodeBuilder.is(ALERT_RULE_TAGS, value[0])
        : nodeBuilder.or(value.map((tag) => nodeBuilder.is(ALERT_RULE_TAGS, tag)))
    );
  },
};

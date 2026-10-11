/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiComboBox,
  type EuiComboBoxOptionOption,
  EuiFormRow,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { TAGS_RESPONSE_LIMIT } from '@kbn/alerting-v2-constants';
import type { PolicyMatcher } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/react-hooks';
import React, { useMemo, useState } from 'react';
import { useFetchRuleRoutingTags } from '../../../../../hooks/use_fetch_rule_routing_tags';
import { optionalLabel } from '../optional_label';

interface RoutingTagsSelectorProps {
  matcher: PolicyMatcher | null;
  onChange: (matcher: PolicyMatcher | null) => void;
}

export const RoutingTagsSelector = ({ matcher, onChange }: RoutingTagsSelectorProps) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const {
    data: apiTags = [],
    isLoading,
    isError,
    isSuccess,
    refetch,
  } = useFetchRuleRoutingTags({
    enabled: true,
    search: debouncedSearch || undefined,
  });

  const selectedTags = matcher?.tags ?? [];

  const options = useMemo((): Array<EuiComboBoxOptionOption<string>> => {
    const groups: Array<EuiComboBoxOptionOption<string>> = [];

    if (apiTags.length > 0) {
      groups.push({
        label: i18n.translate(
          'xpack.alertingV2.actionPolicy.form.policyScope.routingTags.groupRecommended',
          { defaultMessage: 'Recommended' }
        ),
        options: apiTags.map((tag) => ({ label: tag, value: tag })),
      });
    }

    const apiTagSet = new Set(apiTags);
    const orphaned = (matcher?.tags ?? []).filter((t) => !apiTagSet.has(t));

    if (orphaned.length > 0) {
      groups.push({
        label: i18n.translate(
          'xpack.alertingV2.actionPolicy.form.policyScope.routingTags.groupOther',
          { defaultMessage: 'Other' }
        ),
        options: orphaned.map((tag) => ({ label: tag, value: tag })),
      });
    }

    return groups;
  }, [apiTags, matcher?.tags]);

  const showCapGuidance = isSuccess && !search && apiTags.length >= TAGS_RESPONSE_LIMIT;
  const showEmptyState = isSuccess && !search && apiTags.length === 0 && selectedTags.length === 0;

  let helpText: React.ReactNode;
  if (isError) {
    helpText = (
      <>
        <span data-test-subj="routingTagsSelectorError">
          {i18n.translate(
            'xpack.alertingV2.actionPolicy.form.policyScope.routingTags.errorMessage',
            {
              defaultMessage: 'Could not load routing tags.',
            }
          )}{' '}
        </span>
        <EuiLink onClick={() => refetch()} data-test-subj="routingTagsSelectorRetry">
          {i18n.translate('xpack.alertingV2.actionPolicy.form.policyScope.routingTags.retryLabel', {
            defaultMessage: 'Retry',
          })}
        </EuiLink>
      </>
    );
  } else if (showEmptyState) {
    helpText = (
      <EuiText size="xs" color="subdued" data-test-subj="routingTagsSelectorEmptyState">
        {i18n.translate('xpack.alertingV2.actionPolicy.form.policyScope.routingTags.emptyState', {
          defaultMessage:
            'No routing tags in this space yet. Add a routing tag to scope this policy.',
        })}
      </EuiText>
    );
  } else if (showCapGuidance) {
    helpText = (
      <EuiText size="xs" color="subdued" data-test-subj="routingTagsSelectorCapGuidance">
        {i18n.translate('xpack.alertingV2.actionPolicy.form.policyScope.routingTags.capGuidance', {
          defaultMessage: 'Showing first {cap} most-used routing tags. Type to search for more.',
          values: { cap: TAGS_RESPONSE_LIMIT },
        })}
      </EuiText>
    );
  }

  return (
    <EuiFormRow
      label={i18n.translate('xpack.alertingV2.actionPolicy.form.policyScope.routingTags.label', {
        defaultMessage: 'Routing tags',
      })}
      labelAppend={optionalLabel}
      helpText={helpText}
      fullWidth
    >
      <EuiComboBox<string>
        fullWidth
        async
        isLoading={isLoading}
        placeholder={i18n.translate(
          'xpack.alertingV2.actionPolicy.form.policyScope.routingTags.placeholder',
          { defaultMessage: 'Search or add routing tags' }
        )}
        options={options}
        selectedOptions={selectedTags.map((tag) => ({ label: tag, value: tag }))}
        onChange={(selected) => {
          const tags = selected.map((o) => o.value ?? o.label);
          onChange({ ...matcher, tags: tags.length > 0 ? tags : null });
        }}
        onSearchChange={setSearch}
        onCreateOption={(newTag) => {
          const trimmed = newTag.trim();
          if (!trimmed) return;
          if (selectedTags.includes(trimmed)) return;
          onChange({ ...matcher, tags: [...selectedTags, trimmed] });
        }}
        isClearable
        data-test-subj="routingTagsSelector"
      />
    </EuiFormRow>
  );
};

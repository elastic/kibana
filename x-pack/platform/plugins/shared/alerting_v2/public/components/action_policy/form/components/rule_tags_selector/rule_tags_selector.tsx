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
import { useFetchRuleTags } from '../../../../../hooks/use_fetch_rule_tags';
import { optionalLabel } from '../optional_label';

interface RuleTagsSelectorProps {
  matcher: PolicyMatcher | null;
  onChange: (matcher: PolicyMatcher | null) => void;
}

export const RuleTagsSelector = ({ matcher, onChange }: RuleTagsSelectorProps) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const {
    data: apiTags = [],
    isLoading,
    isError,
    isSuccess,
    refetch,
  } = useFetchRuleTags({
    kind: 'alert',
    enabled: true,
    search: debouncedSearch || undefined,
  });

  const selectedTags = useMemo(() => matcher?.tags ?? [], [matcher?.tags]);

  const options = useMemo((): Array<EuiComboBoxOptionOption<string>> => {
    const groups: Array<EuiComboBoxOptionOption<string>> = [];

    if (apiTags.length > 0) {
      groups.push({
        label: i18n.translate(
          'xpack.alertingV2.actionPolicy.form.policyScope.ruleTags.groupRecommended',
          { defaultMessage: 'Recommended' }
        ),
        options: apiTags.map((tag) => ({ label: tag, value: tag })),
      });
    }

    const apiTagSet = new Set(apiTags);
    const orphaned = selectedTags.filter((t) => !apiTagSet.has(t));

    if (orphaned.length > 0) {
      groups.push({
        label: i18n.translate(
          'xpack.alertingV2.actionPolicy.form.policyScope.ruleTags.groupOther',
          { defaultMessage: 'Other' }
        ),
        options: orphaned.map((tag) => ({ label: tag, value: tag })),
      });
    }

    return groups;
  }, [apiTags, selectedTags]);

  const showCapGuidance = isSuccess && !search && apiTags.length >= TAGS_RESPONSE_LIMIT;
  const showEmptyState = isSuccess && !search && apiTags.length === 0 && selectedTags.length === 0;

  const helpText = (() => {
    if (isError) {
      return (
        <>
          <span data-test-subj="ruleTagsSelectorError">
            {i18n.translate(
              'xpack.alertingV2.actionPolicy.form.policyScope.ruleTags.errorMessage',
              { defaultMessage: 'Could not load rule tags.' }
            )}{' '}
          </span>
          <EuiLink onClick={() => refetch()} data-test-subj="ruleTagsSelectorRetry">
            {i18n.translate('xpack.alertingV2.actionPolicy.form.policyScope.ruleTags.retryLabel', {
              defaultMessage: 'Retry',
            })}
          </EuiLink>
        </>
      );
    }
    if (showEmptyState) {
      return (
        <EuiText size="xs" color="subdued" data-test-subj="ruleTagsSelectorEmptyState">
          {i18n.translate('xpack.alertingV2.actionPolicy.form.policyScope.ruleTags.emptyState', {
            defaultMessage: 'No rule tags in this space yet. Add a tag to scope this policy.',
          })}
        </EuiText>
      );
    }
    if (showCapGuidance) {
      return (
        <EuiText size="xs" color="subdued" data-test-subj="ruleTagsSelectorCapGuidance">
          {i18n.translate('xpack.alertingV2.actionPolicy.form.policyScope.ruleTags.capGuidance', {
            defaultMessage: 'Showing first {cap} most-used tags. Type to search for more.',
            values: { cap: TAGS_RESPONSE_LIMIT },
          })}
        </EuiText>
      );
    }
    return undefined;
  })();

  return (
    <EuiFormRow
      label={i18n.translate('xpack.alertingV2.actionPolicy.form.policyScope.ruleTags.label', {
        defaultMessage: 'Rule tags',
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
          'xpack.alertingV2.actionPolicy.form.policyScope.ruleTags.placeholder',
          { defaultMessage: 'Search or add tags' }
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
        data-test-subj="ruleTagsSelector"
      />
    </EuiFormRow>
  );
};

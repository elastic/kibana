/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, type EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PolicyMatcher } from '@kbn/alerting-v2-schemas';
import { useDebouncedValue } from '@kbn/react-hooks';
import React, { useMemo, useState } from 'react';
import { useFetchRuleTags } from '../../../../hooks/use_fetch_rule_tags';

interface RuleTagsMatcherInputProps {
  matcher: PolicyMatcher | null;
  onChange: (matcher: PolicyMatcher | null) => void;
  /**
   * When true, groups unfiltered API tags under "Recommended" (most-used) and
   * search hits under "Other tags".
   */
  showRecommendedGroups?: boolean;
}

/**
 * Combo box that edits `matcher.tags` (OR semantics across selected tags).
 */
export const RuleTagsMatcherInput = ({
  matcher,
  onChange,
  showRecommendedGroups = false,
}: RuleTagsMatcherInputProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 200);
  const { data: existingTags, isLoading } = useFetchRuleTags({
    kind: 'alert',
    search: debouncedQuery || undefined,
  });

  const selectedTags = useMemo(() => matcher?.tags ?? [], [matcher]);

  const writeTags = (tags: string[]) => {
    onChange({
      ...(matcher ?? {}),
      tags: tags.length > 0 ? tags : null,
    });
  };

  const tagOptions = useMemo((): Array<EuiComboBoxOptionOption<string>> => {
    const fromApi = existingTags ?? [];
    const orphans = selectedTags.filter((tag) => !fromApi.includes(tag));
    const isSearching = Boolean(debouncedQuery.trim());

    if (!showRecommendedGroups || isSearching) {
      const seen = new Set<string>();
      return [...orphans, ...fromApi]
        .filter((tag) => {
          if (seen.has(tag)) {
            return false;
          }
          seen.add(tag);
          return true;
        })
        .map((tag) => ({ label: tag }));
    }

    const options: Array<EuiComboBoxOptionOption<string>> = [];
    if (fromApi.length > 0 || orphans.length > 0) {
      options.push({
        label: i18n.translate('xpack.alertingV2.actionPolicy.form.ruleTags.recommended', {
          defaultMessage: 'Recommended',
        }),
        isGroupLabelOption: true,
      });
      for (const tag of orphans) {
        options.push({ label: tag });
      }
      for (const tag of fromApi) {
        options.push({ label: tag });
      }
    }
    return options;
  }, [debouncedQuery, existingTags, selectedTags, showRecommendedGroups]);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.alertingV2.actionPolicy.form.essential.ruleTags', {
        defaultMessage: 'Rule tags',
      })}
      helpText={i18n.translate('xpack.alertingV2.actionPolicy.form.essential.ruleTagsHelp', {
        defaultMessage: 'This policy matches alerts from rules that have any of these tags.',
      })}
      fullWidth
    >
      <EuiComboBox
        aria-label={i18n.translate('xpack.alertingV2.actionPolicy.form.essential.ruleTagsAria', {
          defaultMessage: 'Rule tags',
        })}
        fullWidth
        async
        isLoading={isLoading}
        data-test-subj="essentialRuleTagsInput"
        placeholder={i18n.translate(
          'xpack.alertingV2.actionPolicy.form.essential.ruleTagsPlaceholder',
          { defaultMessage: 'Select or create tags' }
        )}
        selectedOptions={selectedTags.map((tag) => ({ label: tag }))}
        options={tagOptions}
        onSearchChange={setSearchQuery}
        onCreateOption={(value) => {
          const normalized = value.trim();
          if (!normalized || selectedTags.includes(normalized)) {
            return;
          }
          writeTags([...selectedTags, normalized]);
        }}
        onChange={(options) => {
          writeTags(
            options.filter((option) => !option.isGroupLabelOption).map((option) => option.label)
          );
        }}
      />
    </EuiFormRow>
  );
};

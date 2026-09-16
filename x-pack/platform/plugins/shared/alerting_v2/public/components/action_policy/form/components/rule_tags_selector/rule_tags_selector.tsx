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
  EuiText,
} from '@elastic/eui';
import { TAGS_RESPONSE_LIMIT } from '@kbn/alerting-v2-constants';
import type { PolicyMatcher } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { useFetchRuleTags } from '../../../../../hooks/use_fetch_rule_tags';
import { optionalLabel } from '../optional_label';

interface RuleTagsSelectorProps {
  matcher: PolicyMatcher | null;
  onChange: (matcher: PolicyMatcher | null) => void;
}

export const RuleTagsSelector = ({ matcher, onChange }: RuleTagsSelectorProps) => {
  const [customTags, setCustomTags] = useState<string[]>([]);

  const { data: apiTags = [], isLoading } = useFetchRuleTags({ kind: 'alert', enabled: true });

  const selectedTags = useMemo(() => matcher?.tags ?? [], [matcher]);

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
    const orphanedFromMatcher = selectedTags.filter((t) => !apiTagSet.has(t));
    const allCustom = Array.from(new Set([...customTags, ...orphanedFromMatcher]));

    if (allCustom.length > 0) {
      groups.push({
        label: i18n.translate(
          'xpack.alertingV2.actionPolicy.form.policyScope.ruleTags.groupOther',
          { defaultMessage: 'Other' }
        ),
        options: allCustom.map((tag) => ({ label: tag, value: tag })),
      });
    }

    return groups;
  }, [apiTags, customTags, selectedTags]);

  const selectedOptions = useMemo((): Array<EuiComboBoxOptionOption<string>> => {
    return selectedTags.map((tag) => ({ label: tag, value: tag }));
  }, [selectedTags]);

  const handleChange = (selected: Array<EuiComboBoxOptionOption<string>>) => {
    const tags = selected.map((o) => o.value ?? o.label);
    onChange({ ...matcher, tags: tags.length > 0 ? tags : null });
  };

  const handleCreateOption = (newTag: string) => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    setCustomTags((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    onChange({
      ...matcher,
      tags: [...(matcher?.tags ?? []), trimmed],
    });
  };

  const showCapGuidance = apiTags.length >= TAGS_RESPONSE_LIMIT;

  return (
    <EuiFormRow
      label={i18n.translate('xpack.alertingV2.actionPolicy.form.policyScope.ruleTags.label', {
        defaultMessage: 'Rule tags',
      })}
      labelAppend={optionalLabel}
      fullWidth
    >
      <>
        <EuiComboBox<string>
          fullWidth
          isLoading={isLoading}
          options={options}
          selectedOptions={selectedOptions}
          onChange={handleChange}
          onCreateOption={handleCreateOption}
          isClearable
          data-test-subj="ruleTagsSelector"
        />
        {!isLoading && apiTags.length === 0 && customTags.length === 0 && !selectedTags.length && (
          <EuiText
            size="xs"
            color="subdued"
            data-test-subj="ruleTagsSelectorEmptyState"
          >
            {i18n.translate(
              'xpack.alertingV2.actionPolicy.form.policyScope.ruleTags.emptyState',
              {
                defaultMessage:
                  'No rule tags in this space yet. Add a tag to scope this policy.',
              }
            )}
          </EuiText>
        )}
        {showCapGuidance && (
          <EuiText size="xs" color="subdued" data-test-subj="ruleTagsSelectorCapGuidance">
            {i18n.translate(
              'xpack.alertingV2.actionPolicy.form.policyScope.ruleTags.capGuidance',
              {
                defaultMessage:
                  'Showing first {cap} most-used tags. Type to search for more.',
                values: { cap: TAGS_RESPONSE_LIMIT },
              }
            )}
          </EuiText>
        )}
      </>
    </EuiFormRow>
  );
};

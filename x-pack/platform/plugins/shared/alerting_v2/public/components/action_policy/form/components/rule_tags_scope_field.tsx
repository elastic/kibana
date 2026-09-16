/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Policy-scope rule tag picker and advanced KQL matcher.
 * Rule tag selection is local/visual only; it does not write to the form matcher yet.
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
  type EuiSelectableOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/react-hooks';
import React, { useMemo, useState } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useFetchRuleEventFields } from '../../../../hooks/use_fetch_rule_event_fields';
import { useFetchRuleTags } from '../../../../hooks/use_fetch_rule_tags';
import { optionalLabel } from '../form_labels';
import type { ActionPolicyFormState } from '../types';
import { formLabelWithOptionalTip } from './form_label_with_tip';
import { MatcherInput } from './matcher_input';
import {
  RULE_TAGS_PROTOTYPE_MOCK_TAGS,
  type ActionPolicyPrototypeView,
} from './rule_tags_prototype_toggle';

const TAG_SEARCH_DEBOUNCE_MS = 300;

const RULE_TAGS_EMPTY_MESSAGE = i18n.translate(
  'xpack.alertingV2.actionPolicy.form.ruleTags.empty',
  {
    defaultMessage: 'No rule tags found in this space',
  }
);

const RULE_TAGS_RECOMMENDED_GROUP = i18n.translate(
  'xpack.alertingV2.actionPolicy.form.ruleTags.recommendedGroup',
  {
    defaultMessage: 'Recommended',
  }
);

const RULE_TAGS_OTHER_GROUP = i18n.translate(
  'xpack.alertingV2.actionPolicy.form.ruleTags.otherGroup',
  {
    defaultMessage: 'Other',
  }
);

const MATCH_CONDITIONS_LABEL = i18n.translate('xpack.alertingV2.actionPolicy.form.matcher', {
  defaultMessage: 'Match conditions',
});

const MATCH_CONDITIONS_TIP = i18n.translate(
  'xpack.alertingV2.actionPolicy.form.matcher.helpText',
  {
    defaultMessage:
      'A KQL expression that defines which alert episodes meet the conditions for this policy. Leave empty to apply the policy to all episodes in the space.',
  }
);

/** Most-used rule tags (by rule count) appear under Recommended; the rest under Other. */
const RECOMMENDED_RULE_TAG_COUNT = 3;

const RULE_TAG_SELECTABLE_ROW_HEIGHT = 32;
const RULE_TAG_SELECTABLE_VISIBLE_ROWS = 6;
const RULE_TAG_SELECTABLE_LIST_HEIGHT =
  RULE_TAG_SELECTABLE_ROW_HEIGHT * RULE_TAG_SELECTABLE_VISIBLE_ROWS;

const CREATE_CUSTOM_TAG_OPTION_KEY = '__create_custom_tag__';

const RULE_TAG_SEARCH_OR_ADD_PLACEHOLDER = i18n.translate(
  'xpack.alertingV2.actionPolicy.form.ruleTags.searchOrAddPlaceholder',
  {
    defaultMessage: 'Search or add rule tags',
  }
);

const RULE_TAG_ADD_PLACEHOLDER = i18n.translate(
  'xpack.alertingV2.actionPolicy.form.ruleTags.addPlaceholder',
  {
    defaultMessage: 'Add custom rule tag',
  }
);

const RULE_TAG_EMPTY_BODY = i18n.translate(
  'xpack.alertingV2.actionPolicy.form.ruleTags.emptyBody',
  {
    defaultMessage: 'No rule tags in this space yet. Add a tag to scope this policy.',
  }
);

const canCreateCustomTag = ({
  searchValue,
  apiTags,
  selectedTags,
}: {
  searchValue: string;
  apiTags: string[];
  selectedTags: string[];
}) => {
  const trimmed = searchValue.trim();
  if (trimmed.length === 0 || selectedTags.includes(trimmed)) {
    return false;
  }

  const normalized = trimmed.toLowerCase();
  return !apiTags.some((tag) => tag.toLowerCase() === normalized);
};

const RuleTagsInlinePicker = ({
  selectedTags,
  onChangeTags,
  useMockTags,
}: {
  selectedTags: string[];
  onChangeTags: (tags: string[]) => void;
  useMockTags: boolean;
}) => {
  const [tagSearch, setTagSearch] = useState('');
  const debouncedTagSearch = useDebouncedValue(tagSearch, TAG_SEARCH_DEBOUNCE_MS);

  useFetchRuleTags({
    kind: 'alert',
    search: debouncedTagSearch || undefined,
  });

  const hasMockTags = useMockTags;

  const apiTags = useMemo(() => {
    if (!hasMockTags) {
      return [];
    }

    const query = tagSearch.trim().toLowerCase();
    if (query.length === 0) {
      return [...RULE_TAGS_PROTOTYPE_MOCK_TAGS];
    }

    return RULE_TAGS_PROTOTYPE_MOCK_TAGS.filter((tag) => tag.toLowerCase().includes(query));
  }, [hasMockTags, tagSearch]);

  const isLoading = false;

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed.length > 0 && !selectedTags.includes(trimmed)) {
      onChangeTags([...selectedTags, trimmed]);
    }
  };

  const createCustomTagFromSearch = () => {
    const trimmed = tagSearch.trim();
    if (!canCreateCustomTag({ searchValue: tagSearch, apiTags, selectedTags })) {
      return;
    }
    addTag(trimmed);
    setTagSearch('');
  };

  const tagOptions = useMemo((): EuiSelectableOption[] => {
    const selectedSet = new Set(selectedTags);
    const apiTagSet = new Set(apiTags);
    const customTags = selectedTags.filter((tag) => !apiTagSet.has(tag));
    const recommendedTags = apiTags.slice(0, RECOMMENDED_RULE_TAG_COUNT);
    const otherAvailableTags = apiTags.slice(RECOMMENDED_RULE_TAG_COUNT);
    const options: EuiSelectableOption[] = [];
    const trimmedSearch = tagSearch.trim();

    if (canCreateCustomTag({ searchValue: tagSearch, apiTags, selectedTags })) {
      options.push({
        key: CREATE_CUSTOM_TAG_OPTION_KEY,
        label: i18n.translate('xpack.alertingV2.actionPolicy.form.ruleTags.createOption', {
          defaultMessage: 'Add "{tag}" as custom tag',
          values: { tag: trimmedSearch },
        }),
        'data-test-subj': 'ruleTagsCreateOption',
      });
    }

    const toTagOption = (tag: string): EuiSelectableOption => ({
      label: tag,
      checked: (selectedSet.has(tag) ? 'on' : undefined) as EuiSelectableOption['checked'],
    });

    if (recommendedTags.length > 0) {
      options.push({ label: RULE_TAGS_RECOMMENDED_GROUP, isGroupLabel: true });
      options.push(...recommendedTags.map(toTagOption));
    }

    const otherTags = [...otherAvailableTags, ...customTags];
    if (otherTags.length > 0) {
      options.push({ label: RULE_TAGS_OTHER_GROUP, isGroupLabel: true });
      options.push(...otherTags.map(toTagOption));
    }

    return options;
  }, [apiTags, selectedTags, tagSearch]);

  const showEmptyHelper = !isLoading && apiTags.length === 0 && selectedTags.length === 0;
  const searchPlaceholder = showEmptyHelper
    ? RULE_TAG_ADD_PLACEHOLDER
    : RULE_TAG_SEARCH_OR_ADD_PLACEHOLDER;

  return (
    <EuiPanel hasBorder paddingSize="s" data-test-subj="ruleTagsInlinePicker">
      {selectedTags.length > 0 && (
        <EuiFlexGroup gutterSize="s" wrap responsive={false}>
          {selectedTags.map((tag) => (
            <EuiFlexItem grow={false} key={tag}>
              <EuiBadge
                color="hollow"
                iconType="cross"
                iconSide="right"
                iconOnClick={() => onChangeTags(selectedTags.filter((t) => t !== tag))}
                iconOnClickAriaLabel={i18n.translate(
                  'xpack.alertingV2.actionPolicy.form.ruleTags.removeAriaLabel',
                  { defaultMessage: 'Remove {tag}', values: { tag } }
                )}
              >
                {tag}
              </EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
      {selectedTags.length > 0 && <EuiSpacer size="s" />}
      <EuiSelectable
        searchable
        isLoading={isLoading}
        searchProps={{
          value: tagSearch,
          onChange: (searchValue) => setTagSearch(searchValue),
          placeholder: searchPlaceholder,
          'data-test-subj': 'ruleTagsSearch',
          onKeyDown: (event) => {
            if (
              event.key === 'Enter' &&
              canCreateCustomTag({ searchValue: tagSearch, apiTags, selectedTags })
            ) {
              event.preventDefault();
              createCustomTagFromSearch();
            }
          },
        }}
        options={tagOptions}
        onChange={(next, _event, changedOption) => {
          if (changedOption.key === CREATE_CUSTOM_TAG_OPTION_KEY) {
            createCustomTagFromSearch();
            return;
          }

          onChangeTags(
            next
              .filter((option) => option.checked === 'on' && !option.isGroupLabel)
              .map((option) => option.label)
          );
        }}
        emptyMessage={RULE_TAGS_EMPTY_MESSAGE}
        listProps={{
          bordered: false,
          rowHeight: RULE_TAG_SELECTABLE_ROW_HEIGHT,
        }}
        height={tagOptions.length > 0 ? RULE_TAG_SELECTABLE_LIST_HEIGHT : undefined}
        data-test-subj="ruleTagsSelectable"
      >
        {(list, search) => (
          <>
            {search}
            {showEmptyHelper && (
              <>
                <EuiSpacer size="s" />
                <EuiText
                  size="xs"
                  color="subdued"
                  textAlign="center"
                  data-test-subj="ruleTagsEmptyState"
                >
                  <p>{RULE_TAG_EMPTY_BODY}</p>
                </EuiText>
              </>
            )}
            {!(showEmptyHelper && tagOptions.length === 0) && list}
          </>
        )}
      </EuiSelectable>
    </EuiPanel>
  );
};

interface RuleTagsScopeFieldProps {
  selectedTags: string[];
  onChangeTags: (tags: string[]) => void;
  prototypeView: ActionPolicyPrototypeView;
}

export const RuleTagsScopeField = ({
  selectedTags,
  onChangeTags,
  prototypeView,
}: RuleTagsScopeFieldProps) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'ruleTagsAdvancedMatching' });
  const { control } = useFormContext<ActionPolicyFormState>();
  const matcher = useWatch({ control, name: 'matcher' });
  const { data: dataFieldNames } = useFetchRuleEventFields(matcher);
  const useMockTags = prototypeView !== 'empty';

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.alertingV2.actionPolicy.form.ruleTags.label', {
          defaultMessage: 'Rule tags',
        })}
        labelAppend={optionalLabel}
        fullWidth
      >
        <RuleTagsInlinePicker
          selectedTags={selectedTags}
          onChangeTags={onChangeTags}
          useMockTags={useMockTags}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiAccordion
        id={accordionId}
        buttonContent={i18n.translate('xpack.alertingV2.actionPolicy.form.advancedMatching.title', {
          defaultMessage: 'Advanced matching',
        })}
        initialIsOpen={Boolean(matcher)}
        data-test-subj="advancedMatchingAccordion"
      >
        <EuiSpacer size="m" />
        <Controller
          name="matcher"
          control={control}
          render={({ field }) => (
            <EuiFormRow
              label={formLabelWithOptionalTip(
                MATCH_CONDITIONS_LABEL,
                MATCH_CONDITIONS_TIP,
                'matcherLabelTip'
              )}
              labelAppend={optionalLabel}
              fullWidth
            >
              <MatcherInput
                value={field.value}
                onChange={field.onChange}
                fullWidth
                data-test-subj="matcherInput"
                dataFieldNames={dataFieldNames}
                placeholder={i18n.translate(
                  'xpack.alertingV2.actionPolicy.form.matcher.placeholder',
                  {
                    defaultMessage: 'e.g. data.host.name : "my-host.com" and rule.id : "uuid"',
                  }
                )}
              />
            </EuiFormRow>
          )}
        />
      </EuiAccordion>
    </>
  );
};

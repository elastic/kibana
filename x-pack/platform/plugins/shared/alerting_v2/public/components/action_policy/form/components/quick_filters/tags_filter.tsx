/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiCode,
  EuiFilterButton,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSelectable,
  type EuiSelectableOption,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFetchRuleTags } from '../../../../../hooks/use_fetch_rule_tags';
import {
  mergeRuleTagsIntoMatcher,
  parseRuleTagsFromMatcher,
} from '../../matcher_quick_filter_utils';
import { POPOVER_PANEL_STYLE, SELECTABLE_LIST_PROPS, type QuickFiltersProps } from './constants';

interface TagSelectableMeta {
  value: string;
}

export const TagsFilter = ({ matcher, onChange }: QuickFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const tagsPopoverId = useGeneratedHtmlId({ prefix: 'npQuickFilterTags' });

  const { data: apiTags = [], isLoading } = useFetchRuleTags({
    enabled: isOpen,
  });
  const selectedTags = useMemo(() => parseRuleTagsFromMatcher(matcher), [matcher]);

  const tagOptions = useMemo((): Array<EuiSelectableOption<TagSelectableMeta>> => {
    const selectedSet = new Set(selectedTags);
    const apiTagSet = new Set(apiTags);

    // Tags in matcher but not from API (orphaned) — show at top as checked
    const orphaned = selectedTags
      .filter((t) => !apiTagSet.has(t))
      .map((tag) => ({
        label: tag,
        value: tag,
        checked: 'on' as const,
      }));

    const fromApi = apiTags.map((tag) => ({
      label: tag,
      value: tag,
      checked: (selectedSet.has(tag) ? 'on' : undefined) as EuiSelectableOption['checked'],
    }));

    return [...orphaned, ...fromApi];
  }, [apiTags, selectedTags]);

  const handleTagsChange = (newOptions: Array<EuiSelectableOption<TagSelectableMeta>>) => {
    const tags = newOptions.filter((o) => o.checked === 'on').map((o) => o.value);
    onChange(mergeRuleTagsIntoMatcher(matcher, tags));
  };

  return (
    <EuiPopover
      id={tagsPopoverId}
      aria-label={i18n.translate(
        'xpack.alertingV2.actionPolicy.form.quickFilters.tags.popoverAria',
        { defaultMessage: 'Filter by rule tags' }
      )}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="none"
      panelStyle={POPOVER_PANEL_STYLE}
      button={
        <EuiFilterButton
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsOpen((o) => !o)}
          isSelected={isOpen}
          hasActiveFilters={selectedTags.length > 0}
          numActiveFilters={selectedTags.length}
          data-test-subj="quickFilterTags"
        >
          {i18n.translate('xpack.alertingV2.actionPolicy.form.quickFilters.tags', {
            defaultMessage: 'Tags',
          })}
        </EuiFilterButton>
      }
    >
      <EuiSelectable<TagSelectableMeta>
        aria-label={i18n.translate(
          'xpack.alertingV2.actionPolicy.form.quickFilters.tags.selectableAria',
          { defaultMessage: 'Filter by rule tags' }
        )}
        searchable
        isLoading={isLoading}
        options={tagOptions}
        onChange={handleTagsChange}
        searchProps={{
          placeholder: i18n.translate(
            'xpack.alertingV2.actionPolicy.form.quickFilters.tags.search',
            { defaultMessage: 'Search tags' }
          ),
          'data-test-subj': 'quickFilterTagsSearch',
        }}
        listProps={{
          'data-test-subj': 'quickFilterTagsList',
          ...SELECTABLE_LIST_PROPS,
        }}
        emptyMessage={i18n.translate('xpack.alertingV2.actionPolicy.form.quickFilters.tags.empty', {
          defaultMessage: 'No tags found on rules',
        })}
      >
        {(list, searchField) => (
          <>
            <EuiPopoverTitle paddingSize="s">{searchField}</EuiPopoverTitle>
            {list}
          </>
        )}
      </EuiSelectable>
      <EuiPopoverFooter paddingSize="s">
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.alertingV2.actionPolicy.form.quickFilters.tags.footer"
            defaultMessage="Adds {code} to the filter"
            values={{ code: <EuiCode>{'rule.tags: ("...")'}</EuiCode> }}
          />
        </EuiText>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFilterButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistoryTags } from '../use_history_tags';

const POPOVER_WIDTH = 300;

const TAGS_LABEL = i18n.translate('xpack.osquery.historyFilters.tagsLabel', {
  defaultMessage: 'Tags',
});

const SEARCH_TAGS_PLACEHOLDER = i18n.translate(
  'xpack.osquery.historyFilters.searchTagsPlaceholder',
  { defaultMessage: 'Search tags' }
);

const CLEAR_FILTER_LABEL = i18n.translate('xpack.osquery.historyFilters.clearTagsFilter', {
  defaultMessage: 'Clear filter',
});

const PANEL_PROPS = { 'data-test-subj': 'history-tags-filter-popover' };
const POPOVER_CONTENT_STYLE = { width: POPOVER_WIDTH };
const SEARCH_PROPS = { placeholder: SEARCH_TAGS_PLACEHOLDER };

interface TagsFilterPopoverProps {
  selectedTags: string[];
  onSelectedTagsChanged: (newTags: string[]) => void;
}

const caseInsensitiveSort = (items: string[]): string[] =>
  [...items].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

const TagsFilterPopoverComponent: React.FC<TagsFilterPopoverProps> = ({
  selectedTags,
  onSelectedTagsChanged,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { tags: availableTags, isLoading } = useHistoryTags({ enabled: isOpen });

  const selectableOptions = useMemo(() => {
    const selectedSet = new Set(selectedTags);
    const allTags = Array.from(new Set([...availableTags, ...selectedTags]));

    const selected = caseInsensitiveSort(allTags.filter((tag) => selectedSet.has(tag)));
    const unselected = caseInsensitiveSort(allTags.filter((tag) => !selectedSet.has(tag)));

    return [...selected, ...unselected].map((label) => ({
      label,
      checked: selectedSet.has(label) ? ('on' as const) : undefined,
    }));
  }, [availableTags, selectedTags]);

  const handleChange = useCallback(
    (_: EuiSelectableOption[], __: unknown, changedOption: EuiSelectableOption) => {
      const tag = changedOption.label;
      const idx = selectedTags.indexOf(tag);
      const updated = [...selectedTags];
      if (idx >= 0) {
        updated.splice(idx, 1);
      } else {
        updated.push(tag);
      }

      onSelectedTagsChanged(updated);
    },
    [selectedTags, onSelectedTagsChanged]
  );

  const handleClearAll = useCallback(() => onSelectedTagsChanged([]), [onSelectedTagsChanged]);
  const togglePopover = useCallback(() => setIsOpen((prev) => !prev), []);
  const closePopover = useCallback(() => setIsOpen(false), []);

  const triggerButton = (
    <EuiFilterButton
      iconType="arrowDown"
      onClick={togglePopover}
      isLoading={isLoading}
      isSelected={isOpen}
      hasActiveFilters={selectedTags.length > 0}
      numActiveFilters={selectedTags.length}
      data-test-subj="history-tags-filter-button"
    >
      {TAGS_LABEL}
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      ownFocus
      button={triggerButton}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      repositionOnScroll
      panelProps={PANEL_PROPS}
      aria-label={TAGS_LABEL}
    >
      <EuiSelectable
        searchable
        searchProps={SEARCH_PROPS}
        aria-label={TAGS_LABEL}
        options={selectableOptions}
        onChange={handleChange}
        isLoading={isLoading}
        emptyMessage={i18n.translate('xpack.osquery.historyFilters.noTagsAvailable', {
          defaultMessage: 'No tags available',
        })}
        noMatchesMessage={i18n.translate('xpack.osquery.historyFilters.noTagsMatch', {
          defaultMessage: 'No tags match search',
        })}
      >
        {(list, search) => (
          <div css={POPOVER_CONTENT_STYLE}>
            <EuiPopoverTitle paddingSize="s">
              {search}
              {selectedTags.length > 0 && (
                <EuiFlexGroup
                  alignItems="center"
                  justifyContent="spaceBetween"
                  gutterSize="s"
                  responsive={false}
                >
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {i18n.translate('xpack.osquery.historyFilters.selectedTagsCount', {
                        defaultMessage: '{count} selected',
                        values: { count: selectedTags.length },
                      })}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="xs"
                      flush="right"
                      onClick={handleClearAll}
                      data-test-subj="history-tags-filter-clear"
                    >
                      {CLEAR_FILTER_LABEL}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
            </EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

TagsFilterPopoverComponent.displayName = 'TagsFilterPopover';

export const TagsFilterPopover = React.memo(TagsFilterPopoverComponent);

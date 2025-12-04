/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AttachmentType } from '@kbn/streams-plugin/server/lib/streams/attachments/types';
import { debounce } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { ATTACHMENT_TYPE_CONFIG } from './attachment_constants';

const ATTACHMENT_TYPE_OPTIONS = Object.entries(ATTACHMENT_TYPE_CONFIG).map(([type, config]) => ({
  value: type as AttachmentType,
  label: config.label,
}));

export interface AttachmentFiltersState {
  query: string;
  debouncedQuery: string;
  type: AttachmentType | undefined;
  tags: string[];
}

export const DEFAULT_ATTACHMENT_FILTERS: AttachmentFiltersState = {
  query: '',
  debouncedQuery: '',
  type: undefined,
  tags: [],
};

interface AttachmentFiltersProps {
  filters: AttachmentFiltersState;
  onFiltersChange: (
    updater: AttachmentFiltersState | ((prev: AttachmentFiltersState) => AttachmentFiltersState)
  ) => void;
  searchPlaceholder: string;
}

export function AttachmentFilters({
  filters,
  onFiltersChange,
  searchPlaceholder,
}: AttachmentFiltersProps) {
  const [isTypePopoverOpen, setIsTypePopoverOpen] = useState(false);
  const [isTagsPopoverOpen, setIsTagsPopoverOpen] = useState(false);

  const {
    dependencies: {
      start: {
        savedObjectsTagging: { ui: savedObjectsTaggingUi },
      },
    },
  } = useKibana();

  const tagList = savedObjectsTaggingUi.getTagList();

  const updateDebouncedQuery = useMemo(
    () =>
      debounce((query: string) => {
        onFiltersChange((prev) => ({ ...prev, debouncedQuery: query }));
      }, 150),
    [onFiltersChange]
  );

  useEffect(() => {
    return () => {
      updateDebouncedQuery.cancel();
    };
  }, [updateDebouncedQuery]);

  const typePopoverId = useGeneratedHtmlId({
    prefix: 'typePopover',
  });

  const tagsPopoverId = useGeneratedHtmlId({
    prefix: 'tagsPopover',
  });

  const typeFilterButton = (
    <EuiFilterButton
      iconType="arrowDown"
      onClick={() => setIsTypePopoverOpen(!isTypePopoverOpen)}
      isSelected={isTypePopoverOpen}
      numFilters={ATTACHMENT_TYPE_OPTIONS.length}
      hasActiveFilters={filters.type !== undefined}
      numActiveFilters={filters.type !== undefined ? 1 : 0}
    >
      {i18n.translate('xpack.streams.attachmentFilters.typeFilterButtonLabel', {
        defaultMessage: 'Type',
      })}
    </EuiFilterButton>
  );

  const tagsFilterButton = (
    <EuiFilterButton
      iconType="arrowDown"
      badgeColor="accent"
      onClick={() => setIsTagsPopoverOpen(!isTagsPopoverOpen)}
      isSelected={isTagsPopoverOpen}
      numFilters={tagList.length}
      hasActiveFilters={filters.tags.length > 0}
      numActiveFilters={filters.tags.length}
    >
      {i18n.translate('xpack.streams.attachmentFilters.tagsFilterButtonLabel', {
        defaultMessage: 'Tags',
      })}
    </EuiFilterButton>
  );

  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
      <EuiFlexItem grow>
        <EuiFieldSearch
          value={filters.query}
          incremental
          fullWidth
          placeholder={searchPlaceholder}
          onChange={(event) => {
            const nextQuery = event.target.value;
            onFiltersChange((prev) => ({ ...prev, query: nextQuery }));
            updateDebouncedQuery(nextQuery);
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <EuiPopover
            id={typePopoverId}
            button={typeFilterButton}
            isOpen={isTypePopoverOpen}
            closePopover={() => setIsTypePopoverOpen(false)}
            panelPaddingSize="none"
          >
            <EuiSelectable
              singleSelection
              options={ATTACHMENT_TYPE_OPTIONS.map((option) => ({
                label: option.label,
                checked: filters.type === option.value ? 'on' : undefined,
                value: option.value,
              }))}
              onChange={(newOptions) => {
                const selected = newOptions.find((opt) => opt.checked === 'on');
                onFiltersChange((prev) => ({
                  ...prev,
                  type: selected ? selected.value : undefined,
                }));
              }}
            >
              {(list) => (
                <div
                  css={css`
                    min-width: 200px;
                  `}
                >
                  {list}
                </div>
              )}
            </EuiSelectable>
          </EuiPopover>
          <EuiPopover
            id={tagsPopoverId}
            button={tagsFilterButton}
            isOpen={isTagsPopoverOpen}
            closePopover={() => setIsTagsPopoverOpen(false)}
            panelPaddingSize="none"
          >
            <EuiSelectable
              allowExclusions
              searchable
              searchProps={{
                placeholder: i18n.translate('xpack.streams.attachmentFilters.searchTagsLabel', {
                  defaultMessage: 'Search tags',
                }),
                compressed: true,
              }}
              options={(tagList || []).map((tag) => ({
                label: tag.name,
                checked: filters.tags.includes(tag.id) ? 'on' : undefined,
                tagId: tag.id,
              }))}
              onChange={(newOptions) => {
                onFiltersChange((prev) => ({
                  ...prev,
                  tags: newOptions.filter((opt) => opt.checked === 'on').map(({ tagId }) => tagId),
                }));
              }}
            >
              {(list, search) => (
                <div
                  css={css`
                    min-width: 300px;
                  `}
                >
                  <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
                  {list}
                </div>
              )}
            </EuiSelectable>
          </EuiPopover>
        </EuiFilterGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

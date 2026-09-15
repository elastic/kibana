/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFilterButton, EuiPopover, EuiSelectable } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';

import { ActionSourceTypes } from '../../../../../common/types/domain';
import { NO_ACTION_SOURCE_FILTERING_KEYWORD } from '../../../../../common/constants';
import { getActionSourceKindLabel } from '../../../user_actions/translations';
import * as i18n from './translations';

export const SOURCE_FILTER_ID = 'userActionsSource';

const EMPTY_SOURCES: string[] = [];

type SourceOption = EuiSelectableOption<{ value: string }>;

const SOURCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: ActionSourceTypes.agent, label: getActionSourceKindLabel(ActionSourceTypes.agent) },
  {
    value: ActionSourceTypes.workflow,
    label: getActionSourceKindLabel(ActionSourceTypes.workflow),
  },
  { value: ActionSourceTypes.rule, label: getActionSourceKindLabel(ActionSourceTypes.rule) },
  {
    value: ActionSourceTypes.attack,
    label: getActionSourceKindLabel(ActionSourceTypes.attack),
  },
  { value: ActionSourceTypes.api, label: getActionSourceKindLabel(ActionSourceTypes.api) },
  { value: ActionSourceTypes.user, label: getActionSourceKindLabel(ActionSourceTypes.user) },
  { value: NO_ACTION_SOURCE_FILTERING_KEYWORD, label: i18n.NOT_RECORDED_SOURCE },
];

interface SourceFilterProps {
  isLoading?: boolean;
  sources?: string[];
  onSourcesChange: (sources: string[]) => void;
}

/**
 * Multi-select source filter. `none` matches user actions with no `source.type`.
 */
export const SourceFilter = React.memo<SourceFilterProps>(
  ({ sources = EMPTY_SOURCES, onSourcesChange, isLoading = false }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const togglePopover = useCallback(() => setIsPopoverOpen((prevValue) => !prevValue), []);
    const closePopover = useCallback(() => setIsPopoverOpen(false), []);

    const options = useMemo<SourceOption[]>(
      () =>
        SOURCE_OPTIONS.map(({ value, label }) => ({
          label,
          value,
          checked: sources.includes(value) ? ('on' as const) : undefined,
          'data-test-subj': `user-actions-filter-bar-source-option-${value}`,
        })),
      [sources]
    );

    const onChange = useCallback(
      (newOptions: SourceOption[]) => {
        const selected = newOptions
          .filter((option) => option.checked === 'on')
          .map((option) => option.value);
        onSourcesChange(selected);
      },
      [onSourcesChange]
    );

    const selectedLabel = useMemo(() => {
      if (sources.length === 0) return i18n.ALL_SOURCES;
      if (sources.length === 1) {
        return (
          SOURCE_OPTIONS.find((option) => option.value === sources[0])?.label ??
          i18n.NOT_RECORDED_SOURCE
        );
      }
      return i18n.SOURCES_SELECTED(sources.length);
    }, [sources]);

    return (
      <EuiPopover
        ownFocus
        aria-label={i18n.SOURCE}
        button={
          <EuiFilterButton
            data-test-subj="user-actions-filter-bar-source-button"
            iconType="chevronSingleDown"
            onClick={togglePopover}
            isSelected={isPopoverOpen}
            hasActiveFilters={sources.length > 0}
            isLoading={isLoading}
            isDisabled={isLoading}
          >
            {`${i18n.SOURCE}: ${selectedLabel}`}
          </EuiFilterButton>
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        repositionOnScroll
        data-test-subj={`options-filter-popover-${SOURCE_FILTER_ID}`}
      >
        <EuiSelectable<{ value: string }>
          options={options}
          singleSelection={false}
          onChange={onChange}
          aria-label={i18n.SOURCE}
        >
          {(list) => (
            <div
              css={css`
                width: 240px;
              `}
            >
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    );
  }
);

SourceFilter.displayName = 'SourceFilter';

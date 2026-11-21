/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiFilterButton,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  CASE_STATUS_CATEGORIES,
  CASE_STATUS_CATEGORY_LABELS,
} from '../../../../common/investigations/statuses';
import type { CaseStatusConfiguration } from '../../../../common/investigations/statuses';
import type { InvestigationStatus } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import * as i18n from './translations';

const CATEGORY_PREFIX = 'category:';
const KEY_PREFIX = 'key:';
const MAX_VISIBLE_OPTIONS = 20;
/** The list's own padding, so the last option is not cut off. */
const LIST_PADDING_PX = 40;
const ROW_HEIGHT_PX = 32;

export interface StatusFilterProps {
  statuses: CaseStatusConfiguration[];
  /** Selected categories (`status`). */
  categories: InvestigationStatus[];
  /** Selected statuses (`status_key`). */
  keys: string[];
  onChange: (selection: { categories: InvestigationStatus[]; keys: string[] }) => void;
}

const isCategory = (value: string): value is InvestigationStatus =>
  CASE_STATUS_CATEGORIES.some((category) => category === value);

/**
 * Statuses grouped by category. Picking "All {category}" filters by the whole category; picking
 * a status filters by that status. The two kinds never mix, because they would narrow each other
 * down to nothing: the kind picked last replaces the other.
 */
export const StatusFilter: React.FC<StatusFilterProps> = ({
  statuses,
  categories,
  keys,
  onChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: 'investigationsStatusFilter' });

  const options = useMemo<EuiSelectableOption[]>(() => {
    const known = new Set(statuses.map(({ key }) => key));
    const result: EuiSelectableOption[] = [];
    CASE_STATUS_CATEGORIES.forEach((category) => {
      const categoryLabel = CASE_STATUS_CATEGORY_LABELS[category];
      result.push({ key: `group:${category}`, label: categoryLabel, isGroupLabel: true });
      result.push({
        key: `${CATEGORY_PREFIX}${category}`,
        label: i18n.STATUS_ALL_IN_CATEGORY(categoryLabel.toLowerCase()),
        checked: categories.includes(category) ? 'on' : undefined,
        'data-test-subj': `investigationsFilterStatus-option-category-${category}`,
      });
      statuses
        .filter((status) => status.category === category)
        .sort((a, b) => a.order - b.order)
        .forEach(({ key, label, disabled }) =>
          result.push({
            key: `${KEY_PREFIX}${key}`,
            label: disabled ? i18n.STATUS_DISABLED_LABEL(label) : label,
            checked: keys.includes(key) ? 'on' : undefined,
            'data-test-subj': `investigationsFilterStatus-option-${key}`,
          })
        );
    });
    // A status in the URL that is no longer configured stays visible so it can be removed.
    keys
      .filter((key) => !known.has(key))
      .forEach((key) =>
        result.push({
          key: `${KEY_PREFIX}${key}`,
          label: key,
          checked: 'on',
          'data-test-subj': `investigationsFilterStatus-option-${key}`,
        })
      );
    return result;
  }, [statuses, categories, keys]);

  const activeCount = categories.length + keys.length;

  const handleChange = (changed: EuiSelectableOption[]) => {
    const checkedKeys = changed
      .filter(({ checked, isGroupLabel }) => checked === 'on' && !isGroupLabel)
      .map(({ key }) => String(key));
    const nextCategories = checkedKeys
      .filter((key) => key.startsWith(CATEGORY_PREFIX))
      .map((key) => key.slice(CATEGORY_PREFIX.length))
      .filter(isCategory);
    const nextKeys = checkedKeys
      .filter((key) => key.startsWith(KEY_PREFIX))
      .map((key) => key.slice(KEY_PREFIX.length));

    if (nextCategories.length > 0 && nextKeys.length > 0) {
      const addedCategory = nextCategories.some((category) => !categories.includes(category));
      onChange(
        addedCategory
          ? { categories: nextCategories, keys: [] }
          : { categories: [], keys: nextKeys }
      );
      return;
    }
    onChange({ categories: nextCategories, keys: nextKeys });
  };

  return (
    <EuiPopover
      id={popoverId}
      aria-label={i18n.FILTER_STATUS}
      button={
        <EuiFilterButton
          iconType={ICONS.chevronDown}
          onClick={() => setIsOpen((open) => !open)}
          isSelected={isOpen}
          hasActiveFilters={activeCount > 0}
          numActiveFilters={activeCount > 0 ? activeCount : undefined}
          aria-label={
            activeCount > 0
              ? i18n.FILTER_ACTIVE_COUNT(i18n.FILTER_STATUS, activeCount)
              : i18n.FILTER_STATUS
          }
          data-test-subj="investigationsFilterStatus"
        >
          {i18n.FILTER_STATUS}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiSelectable
        aria-label={i18n.FILTER_STATUS}
        options={options}
        height={Math.min(options.length, MAX_VISIBLE_OPTIONS) * ROW_HEIGHT_PX + LIST_PADDING_PX}
        onChange={handleChange}
        listProps={{ onFocusBadge: false, rowHeight: ROW_HEIGHT_PX }}
      >
        {(list) => (
          <div
            css={css`
              width: ${euiTheme.base * 18}px;
            `}
          >
            <EuiPopoverTitle paddingSize="s">{i18n.FILTER_STATUS}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
StatusFilter.displayName = 'StatusFilter';

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
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiButtonGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const POPOVER_WIDTH = 250;
const POPOVER_CONTENT_STYLE = { width: POPOVER_WIDTH };

const SORT_LABEL = i18n.translate('xpack.osquery.tableToolbar.sortLabel', {
  defaultMessage: 'Sort',
});

const SORT_FIELDS_LABEL = i18n.translate('xpack.osquery.tableToolbar.sortFieldsLabel', {
  defaultMessage: 'Sort fields',
});

const SORT_DIRECTION_PREFIX = 'sort-direction';

const DIRECTION_OPTIONS = [
  {
    id: `${SORT_DIRECTION_PREFIX}-asc`,
    label: i18n.translate('xpack.osquery.tableToolbar.sortAscLabel', {
      defaultMessage: 'Asc',
    }),
  },
  {
    id: `${SORT_DIRECTION_PREFIX}-desc`,
    label: i18n.translate('xpack.osquery.tableToolbar.sortDescLabel', {
      defaultMessage: 'Desc',
    }),
  },
];

export type SortDirection = 'asc' | 'desc';

export interface SortFieldConfig {
  id: string;
  label: string;
}

interface SortFieldsPopoverProps {
  fields: SortFieldConfig[];
  sortField: string;
  sortDirection: SortDirection;
  onSortChange: (field: string, direction: SortDirection) => void;
  'data-test-subj'?: string;
}

const SortFieldsPopoverComponent: React.FC<SortFieldsPopoverProps> = ({
  fields,
  sortField,
  sortDirection,
  onSortChange,
  'data-test-subj': dataTestSubj = 'sort-fields',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectableOptions = useMemo<EuiSelectableOption[]>(
    () =>
      fields.map(({ id, label }) => ({
        label,
        key: id,
        checked: sortField === id ? 'on' : undefined,
      })),
    [fields, sortField]
  );

  const handleFieldChange = useCallback(
    (_: EuiSelectableOption[], __: unknown, changedOption: EuiSelectableOption) => {
      const newField = changedOption.key!;
      if (newField !== sortField) {
        onSortChange(newField, sortDirection);
      }
    },
    [sortField, sortDirection, onSortChange]
  );

  const handleDirectionChange = useCallback(
    (optionId: string) => {
      const direction = optionId === `${SORT_DIRECTION_PREFIX}-asc` ? 'asc' : 'desc';
      onSortChange(sortField, direction);
    },
    [sortField, onSortChange]
  );

  const togglePopover = useCallback(() => setIsOpen((prev) => !prev), []);
  const closePopover = useCallback(() => setIsOpen(false), []);
  const panelProps = useMemo(
    () => ({ 'data-test-subj': `${dataTestSubj}-popover` }),
    [dataTestSubj]
  );

  const selectedDirectionId = `${SORT_DIRECTION_PREFIX}-${sortDirection}`;

  const triggerButton = (
    <EuiButtonEmpty
      size="xs"
      iconType="sortable"
      onClick={togglePopover}
      data-test-subj={`${dataTestSubj}-button`}
    >
      {SORT_FIELDS_LABEL}
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      ownFocus
      button={triggerButton}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      repositionOnScroll
      panelProps={panelProps}
      aria-label={SORT_FIELDS_LABEL}
    >
      <div style={POPOVER_CONTENT_STYLE}>
        <EuiPopoverTitle paddingSize="s">
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem>{SORT_LABEL}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonGroup
                legend={SORT_LABEL}
                options={DIRECTION_OPTIONS}
                idSelected={selectedDirectionId}
                onChange={handleDirectionChange}
                buttonSize="compressed"
                data-test-subj={`${dataTestSubj}-direction`}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverTitle>
        <EuiSelectable
          aria-label={SORT_LABEL}
          options={selectableOptions}
          onChange={handleFieldChange}
          singleSelection
        >
          {(list) => list}
        </EuiSelectable>
      </div>
    </EuiPopover>
  );
};

SortFieldsPopoverComponent.displayName = 'SortFieldsPopover';

export const SortFieldsPopover = React.memo(SortFieldsPopoverComponent);

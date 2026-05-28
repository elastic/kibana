/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  type EuiSelectableOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ActiveTagFilters, TagKey } from './fake_entities';
import { TAG_KEYS, TAG_KEY_LABEL } from './fake_entities';

interface Props {
  readonly facets: Record<TagKey, string[]>;
  readonly activeFilters: ActiveTagFilters;
  readonly onChange: (next: ActiveTagFilters) => void;
}

const FilterDropdown = ({
  tagKey,
  options,
  selected,
  onChange,
}: {
  tagKey: TagKey;
  options: readonly string[];
  selected: readonly string[];
  onChange: (next: readonly string[]) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const items = useMemo<EuiSelectableOption[]>(
    () =>
      options.map((value) => ({
        label: value,
        key: value,
        checked: selected.includes(value) ? 'on' : undefined,
      })),
    [options, selected]
  );

  const label = TAG_KEY_LABEL[tagKey];

  return (
    <EuiPopover
      id={`entityCentricLabTagFilter-${tagKey}`}
      aria-label={i18n.translate(
        'xpack.streams.entityCentricLab.entities.tagFilter.popoverAriaLabel',
        {
          defaultMessage: 'Filter by {label}',
          values: { label: label.toLowerCase() },
        }
      )}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downCenter"
      button={
        <EuiFilterButton
          iconType="arrowDown"
          isSelected={isOpen}
          numFilters={options.length}
          numActiveFilters={selected.length}
          hasActiveFilters={selected.length > 0}
          onClick={() => setIsOpen((prev) => !prev)}
          data-test-subj={`entityCentricLabTagFilterButton-${tagKey}`}
          grow={false}
        >
          {label}
        </EuiFilterButton>
      }
    >
      <EuiSelectable
        searchable
        searchProps={{
          placeholder: i18n.translate(
            'xpack.streams.entityCentricLab.entities.tagFilter.searchPlaceholder',
            {
              defaultMessage: 'Filter {label}',
              values: { label: label.toLowerCase() },
            }
          ),
          'data-test-subj': `entityCentricLabTagFilterSearch-${tagKey}`,
          compressed: true,
        }}
        options={items}
        onChange={(next) => {
          const checked = next.filter((opt) => opt.checked === 'on').map((opt) => String(opt.key));
          onChange(checked);
        }}
        listProps={{
          'aria-label': i18n.translate(
            'xpack.streams.entityCentricLab.entities.tagFilter.listAriaLabel',
            {
              defaultMessage: '{label} values',
              values: { label },
            }
          ),
        }}
        emptyMessage={i18n.translate(
          'xpack.streams.entityCentricLab.entities.tagFilter.emptyValues',
          { defaultMessage: 'No values available' }
        )}
      >
        {(list, search) => (
          <div style={{ width: 260 }}>
            <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

export const EntitiesTagFilters = ({ facets, activeFilters, onChange }: Props) => {
  const totalActive = useMemo(
    () => TAG_KEYS.reduce((sum, key) => sum + activeFilters[key].length, 0),
    [activeFilters]
  );

  const updateKey = (key: TagKey) => (next: readonly string[]) => {
    onChange({ ...activeFilters, [key]: next });
  };

  const clearAll = () => {
    onChange({ application: [], environment: [], team: [], region: [] });
  };

  return (
    <EuiFilterGroup
      data-test-subj="entityCentricLabTagFilters"
      aria-label={i18n.translate(
        'xpack.streams.entityCentricLab.entities.tagFilter.groupAriaLabel',
        { defaultMessage: 'Entity tag filters' }
      )}
    >
      {TAG_KEYS.map((key) => (
        <FilterDropdown
          key={key}
          tagKey={key}
          options={facets[key]}
          selected={activeFilters[key]}
          onChange={updateKey(key)}
        />
      ))}
      {totalActive > 0 ? (
        <EuiButtonEmpty
          size="s"
          iconType="cross"
          onClick={clearAll}
          data-test-subj="entityCentricLabTagFiltersClear"
        >
          {i18n.translate('xpack.streams.entityCentricLab.entities.tagFilter.clearAll', {
            defaultMessage: 'Clear filters',
          })}
        </EuiButtonEmpty>
      ) : null}
    </EuiFilterGroup>
  );
};

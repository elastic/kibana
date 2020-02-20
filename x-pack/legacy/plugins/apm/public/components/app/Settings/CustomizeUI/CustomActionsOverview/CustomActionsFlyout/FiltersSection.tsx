/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import React from 'react';

type Keys = 'key' | 'value';
export type Filter = {
  [key in Keys]: string;
};

const DEFAULT_OPTION = {
  value: 'DEFAULT',
  text: i18n.translate(
    'xpack.apm.settings.customizeUI.customActions.flyOut.filters.defaultOption',
    {
      defaultMessage: 'Select fields...'
    }
  )
};

const filterOptions = [
  DEFAULT_OPTION,
  { value: 'service.name', text: 'service.name' },
  { value: 'service.environment', text: 'service.environment' },
  { value: 'transaction.type', text: 'transaction.type' },
  { value: 'transaction.name', text: 'transaction.name' }
];

export const FiltersSection = ({
  filters = [{ key: '', value: '' }],
  onChange
}: {
  filters: Filter[];
  onChange?: (filters: Filter[]) => void;
}) => {
  const onChangeFilter = (key: Keys, value: string, idx: number) => {
    const copyOfFilters = [...filters];
    copyOfFilters[idx][key] = value;
    if (typeof onChange === 'function') {
      onChange(copyOfFilters);
    }
  };

  const onRemoveFilter = (idx: number) => {
    const copyOfFilters = [...filters];
    copyOfFilters.splice(idx, 1);
    // When empty, means that it was the last filter that got removed,
    // so instead of showing an empty list, will add a new empty filter.
    if (isEmpty(copyOfFilters)) {
      copyOfFilters.push({ key: '', value: '' });
    }
    if (typeof onChange === 'function') {
      onChange(copyOfFilters);
    }
  };

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate(
            'xpack.apm.settings.customizeUI.customActions.flyout.filters.title',
            {
              defaultMessage: 'Filters'
            }
          )}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="xs">
        {i18n.translate(
          'xpack.apm.settings.customizeUI.customActions.flyout.filters.subtitle',
          {
            defaultMessage:
              'Add additional values within the same field by comma separating values.'
          }
        )}
      </EuiText>
      {filters.map((filter, idx) => {
        const filterId = `filter-${idx}`;
        return (
          <EuiFlexGroup key={filterId} gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiSelect
                id={filterId}
                fullWidth
                options={filterOptions.filter(option => {
                  const indexUsedFilter = filters.findIndex(
                    _filter => _filter.key === option.value
                  );
                  // Filter out all items already added, besides the one selected in the current filter.
                  return indexUsedFilter === -1 || idx === indexUsedFilter;
                })}
                value={filter.key}
                onChange={e => onChangeFilter('key', e.target.value, idx)}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFieldText
                placeholder={i18n.translate(
                  'xpack.apm.settings.customizeUI.customActions.flyOut.filters.defaultOption.value',
                  { defaultMessage: 'Value' }
                )}
                onChange={e => onChangeFilter('value', e.target.value, idx)}
                value={filter.value}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="trash"
                onClick={() => onRemoveFilter(idx)}
                disabled={!filter.key && filters.length === 1}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      })}
      <EuiSpacer size="xs" />
      <EuiButtonEmpty
        iconType="plusInCircle"
        onClick={() => {
          if (typeof onChange === 'function') {
            onChange([...filters, { key: '', value: '' }]);
          }
        }}
        // Disable button when user has already added all items available
        disabled={filters.length === filterOptions.length - 1}
      >
        {i18n.translate(
          'xpack.apm.settings.customizeUI.customActions.flyout.filters.addAnotherFilter',
          {
            defaultMessage: 'Add another filter'
          }
        )}
      </EuiButtonEmpty>
    </>
  );
};

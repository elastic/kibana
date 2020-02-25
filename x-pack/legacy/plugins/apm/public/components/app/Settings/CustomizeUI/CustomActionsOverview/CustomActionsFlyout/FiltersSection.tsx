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
import React, { useRef } from 'react';
import { CustomActionFormData } from '.';

type FiltersType = CustomActionFormData['filters'];

const DEFAULT_OPTION = {
  value: 'DEFAULT',
  text: i18n.translate(
    'xpack.apm.settings.customizeUI.customActions.flyOut.filters.defaultOption',
    { defaultMessage: 'Select fields...' }
  )
};

const filterOptions = [
  DEFAULT_OPTION,
  { value: 'service.name', text: 'service.name' },
  { value: 'service.environment', text: 'service.environment' },
  { value: 'transaction.type', text: 'transaction.type' },
  { value: 'transaction.name', text: 'transaction.name' }
];

const getSelectOptions = (filters: FiltersType, idx: number) => {
  return filterOptions.filter(option => {
    const indexUsedFilter = filters.findIndex(
      filter => filter[0] === option.value
    );
    // Filter out all items already added, besides the one selected in the current filter.
    return indexUsedFilter === -1 || idx === indexUsedFilter;
  });
};

export const FiltersSection = ({
  filters,
  onChangeFilters
}: {
  filters: FiltersType;
  onChangeFilters: (filters: FiltersType) => void;
}) => {
  const filterValueRefs = useRef<HTMLInputElement[]>([]);

  const onChangeFilter = (filter: FiltersType[0], idx: number) => {
    if (filterValueRefs.current[idx]) {
      filterValueRefs.current[idx].focus();
    }
    const copyOfFilters = [...filters];
    copyOfFilters[idx] = filter;
    onChangeFilters(copyOfFilters);
  };

  const onRemoveFilter = (idx: number) => {
    const copyOfFilters = [...filters];
    copyOfFilters.splice(idx, 1);
    // When empty, means that it was the last filter that got removed,
    // so instead of showing an empty list, will add a new empty filter.
    if (isEmpty(copyOfFilters)) {
      copyOfFilters.push(['', '']);
    }

    onChangeFilters(copyOfFilters);
  };

  const handleAddFilter = () => {
    onChangeFilters([...filters, ['', '']]);
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

      <EuiSpacer size="s" />

      {filters.map((filter, idx) => {
        const [key, value] = filter;
        const filterId = `filter-${idx}`;
        const selectOptions = getSelectOptions(filters, idx);
        return (
          <EuiFlexGroup key={filterId} gutterSize="s" alignItems="center">
            <EuiFlexItem>
              <EuiSelect
                id={filterId}
                fullWidth
                options={selectOptions}
                value={key}
                prepend={i18n.translate(
                  'xpack.apm.settings.customizeUI.customActions.flyout.filters.prepend',
                  {
                    defaultMessage: 'Field'
                  }
                )}
                onChange={e => onChangeFilter([e.target.value, value], idx)}
                isInvalid={
                  !isEmpty(value) &&
                  (isEmpty(key) || key === DEFAULT_OPTION.value)
                }
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFieldText
                fullWidth
                placeholder={i18n.translate(
                  'xpack.apm.settings.customizeUI.customActions.flyOut.filters.defaultOption.value',
                  { defaultMessage: 'Value' }
                )}
                onChange={e => onChangeFilter([key, e.target.value], idx)}
                value={value}
                isInvalid={!isEmpty(key) && isEmpty(value)}
                inputRef={ref => {
                  if (ref) {
                    filterValueRefs.current.push(ref);
                  } else {
                    filterValueRefs.current.splice(idx, 1);
                  }
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="trash"
                onClick={() => onRemoveFilter(idx)}
                disabled={!key && filters.length === 1}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      })}

      <EuiSpacer size="xs" />

      <AddFilterButton
        onClick={handleAddFilter}
        // Disable button when user has already added all items available
        isDisabled={filters.length === filterOptions.length - 1}
      />
    </>
  );
};

const AddFilterButton = ({
  onClick,
  isDisabled
}: {
  onClick: () => void;
  isDisabled: boolean;
}) => (
  <EuiButtonEmpty
    iconType="plusInCircle"
    onClick={onClick}
    disabled={isDisabled}
  >
    {i18n.translate(
      'xpack.apm.settings.customizeUI.customActions.flyout.filters.addAnotherFilter',
      {
        defaultMessage: 'Add another filter'
      }
    )}
  </EuiButtonEmpty>
);

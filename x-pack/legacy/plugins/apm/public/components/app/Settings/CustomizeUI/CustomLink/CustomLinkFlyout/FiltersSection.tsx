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
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { FilterOptions } from '../../../../../../../../../../plugins/apm/server/routes/settings/custom_link';
import {
  DEFAULT_OPTION,
  Filters,
  filterSelectOptions,
  getSelectOptions
} from './helper';

export const FiltersSection = ({
  filters,
  onChangeFilters
}: {
  filters: Filters;
  onChangeFilters: (filters: Filters) => void;
}) => {
  const onChangeFilter = (filter: Filters[0], idx: number) => {
    const newFilters = [...filters];
    newFilters[idx] = filter;
    onChangeFilters(newFilters);
  };

  const onRemoveFilter = (idx: number) => {
    // remove without mutating original array
    const newFilters = [...filters].splice(idx, 1);

    // if there is only one item left it should not be removed
    // but reset to empty
    if (isEmpty(newFilters)) {
      onChangeFilters([['', '']]);
    } else {
      onChangeFilters(newFilters);
    }
  };

  const handleAddFilter = () => {
    onChangeFilters([...filters, ['', '']]);
  };

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate(
            'xpack.apm.settings.customizeUI.customLink.flyout.filters.title',
            {
              defaultMessage: 'Filters'
            }
          )}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="xs">
        {i18n.translate(
          'xpack.apm.settings.customizeUI.customLink.flyout.filters.subtitle',
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
                aria-label={filterId}
                id={filterId}
                fullWidth
                options={selectOptions}
                value={key}
                prepend={i18n.translate(
                  'xpack.apm.settings.customizeUI.customLink.flyout.filters.prepend',
                  {
                    defaultMessage: 'Field'
                  }
                )}
                onChange={e =>
                  onChangeFilter(
                    [e.target.value as keyof FilterOptions, value],
                    idx
                  )
                }
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
                  'xpack.apm.settings.customizeUI.customLink.flyOut.filters.defaultOption.value',
                  { defaultMessage: 'Value' }
                )}
                onChange={e => onChangeFilter([key, e.target.value], idx)}
                value={value}
                isInvalid={!isEmpty(key) && isEmpty(value)}
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
        isDisabled={filters.length === filterSelectOptions.length - 1}
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
      'xpack.apm.settings.customizeUI.customLink.flyout.filters.addAnotherFilter',
      {
        defaultMessage: 'Add another filter'
      }
    )}
  </EuiButtonEmpty>
);

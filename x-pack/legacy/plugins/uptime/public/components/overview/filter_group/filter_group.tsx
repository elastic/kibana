/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiFilterGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FilterPopoverProps, FilterPopover } from './filter_popover';
import { FilterStatusButton } from './filter_status_button';
import { OverviewFilters } from '../../../../common/runtime_types/overview_filters';
import { filterLabels } from './translations';
import { useFilterUpdate } from '../../../hooks/use_filter_update';

interface PresentationalComponentProps {
  loading: boolean;
  overviewFilters: OverviewFilters;
}

export const FilterGroupComponent: React.FC<PresentationalComponentProps> = ({
  overviewFilters,
  loading,
}) => {
  const { locations, ports, schemes, tags } = overviewFilters;

  const [updatedFieldValues, setUpdatedFieldValues] = useState<{
    fieldName: string;
    values: string[];
  }>({ fieldName: '', values: [] });

  const currentFilters = useFilterUpdate(updatedFieldValues.fieldName, updatedFieldValues.values);

  const onFilterFieldChange = (fieldName: string, values: string[]) => {
    setUpdatedFieldValues({ fieldName, values });
  };

  const getSelectedItems = (fieldName: string) => currentFilters.get(fieldName) || [];

  const filterPopoverProps: FilterPopoverProps[] = [
    {
      loading,
      onFilterFieldChange,
      fieldName: 'observer.geo.name',
      id: 'location',
      items: locations,
      selectedItems: getSelectedItems('observer.geo.name'),
      title: filterLabels.LOCATION,
    },
    {
      loading,
      onFilterFieldChange,
      fieldName: 'url.port',
      id: 'port',
      disabled: ports.length === 0,
      items: ports.map((p: number) => p.toString()),
      selectedItems: getSelectedItems('url.port'),
      title: filterLabels.PORT,
    },
    {
      loading,
      onFilterFieldChange,
      fieldName: 'monitor.type',
      id: 'scheme',
      disabled: schemes.length === 0,
      items: schemes,
      selectedItems: getSelectedItems('monitor.type'),
      title: filterLabels.SCHEME,
    },
    {
      loading,
      onFilterFieldChange,
      fieldName: 'tags',
      id: 'tags',
      disabled: tags.length === 0,
      items: tags,
      selectedItems: getSelectedItems('tags'),
      title: filterLabels.TAGS,
    },
  ];

  return (
    <EuiFilterGroup>
      <FilterStatusButton
        content={i18n.translate('xpack.uptime.filterBar.filterUpLabel', {
          defaultMessage: 'Up',
        })}
        dataTestSubj="xpack.uptime.filterBar.filterStatusUp"
        value="up"
        withNext={true}
      />
      <FilterStatusButton
        content={i18n.translate('xpack.uptime.filterBar.filterDownLabel', {
          defaultMessage: 'Down',
        })}
        dataTestSubj="xpack.uptime.filterBar.filterStatusDown"
        value="down"
        withNext={false}
      />
      {filterPopoverProps.map(item => (
        <FilterPopover key={item.id} {...item} />
      ))}
    </EuiFilterGroup>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFilterGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FilterPopoverProps, FilterPopover } from './filter_popover';
import { FilterStatusButton } from './filter_status_button';
import { OverviewFilters } from '../../../../common/runtime_types/overview_filters';

interface PresentationalComponentProps {
  loading: boolean;
  overviewFilters: OverviewFilters;
  currentFilter: string;
  onFilterUpdate: (filtersKuery: string) => void;
}

export const FilterGroupComponent: React.FC<PresentationalComponentProps> = ({
  currentFilter,
  overviewFilters,
  loading,
  onFilterUpdate,
}) => {
  const { locations, ports, schemes, tags } = overviewFilters;

  let filterKueries: Map<string, string[]>;
  try {
    filterKueries = new Map<string, string[]>(JSON.parse(currentFilter));
  } catch {
    filterKueries = new Map<string, string[]>();
  }

  /**
   * Handle an added or removed value to filter against for an uptime field.
   * @param fieldName the name of the field to filter against
   * @param values the list of values to use when filter a field
   */
  const onFilterFieldChange = (fieldName: string, values: string[]) => {
    // add new term to filter map, toggle it off if already present
    const updatedFilterMap = new Map<string, string[]>(filterKueries);
    updatedFilterMap.set(fieldName, values);
    Array.from(updatedFilterMap.keys()).forEach(key => {
      const value = updatedFilterMap.get(key);
      if (value && value.length === 0) {
        updatedFilterMap.delete(key);
      }
    });

    // store the new set of filters
    const persistedFilters = Array.from(updatedFilterMap);
    onFilterUpdate(persistedFilters.length === 0 ? '' : JSON.stringify(persistedFilters));
  };

  const getSelectedItems = (fieldName: string) => filterKueries.get(fieldName) || [];

  const filterPopoverProps: FilterPopoverProps[] = [
    {
      loading,
      onFilterFieldChange,
      fieldName: 'observer.geo.name',
      id: 'location',
      items: locations,
      selectedItems: getSelectedItems('observer.geo.name'),
      title: i18n.translate('xpack.uptime.filterBar.options.location.name', {
        defaultMessage: 'Location',
      }),
    },
    {
      loading,
      onFilterFieldChange,
      fieldName: 'url.port',
      id: 'port',
      disabled: ports.length === 0,
      items: ports.map((p: number) => p.toString()),
      selectedItems: getSelectedItems('url.port'),
      title: i18n.translate('xpack.uptime.filterBar.options.portLabel', { defaultMessage: 'Port' }),
    },
    {
      loading,
      onFilterFieldChange,
      fieldName: 'monitor.type',
      id: 'scheme',
      disabled: schemes.length === 0,
      items: schemes,
      selectedItems: getSelectedItems('monitor.type'),
      title: i18n.translate('xpack.uptime.filterBar.options.schemeLabel', {
        defaultMessage: 'Scheme',
      }),
    },
    {
      loading,
      onFilterFieldChange,
      fieldName: 'tags',
      id: 'tags',
      disabled: tags.length === 0,
      items: tags,
      selectedItems: getSelectedItems('tags'),
      title: i18n.translate('xpack.uptime.filterBar.options.tagsLabel', {
        defaultMessage: 'Tags',
      }),
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

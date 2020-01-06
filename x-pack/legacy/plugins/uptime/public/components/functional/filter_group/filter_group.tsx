/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFilterGroup } from '@elastic/eui';
import React, { useEffect } from 'react';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FilterBar as FilterBarType } from '../../../../common/graphql/types';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../../higher_order';
import { filterBarQuery } from '../../../queries';
import { FilterPopoverProps, FilterPopover } from './filter_popover';
import { FilterStatusButton } from './filter_status_button';

interface FilterBarQueryResult {
  filters?: FilterBarType;
}

interface FilterBarDropdownsProps {
  currentFilter: string;
  onFilterUpdate: (kuery: string) => void;
}

type Props = UptimeGraphQLQueryProps<FilterBarQueryResult> & FilterBarDropdownsProps;

export const FilterGroupComponent = ({
  loading: isLoading,
  currentFilter,
  data,
  onFilterUpdate,
}: Props) => {
  const locations = get<string[]>(data, 'filterBar.locations', []);
  const ports = get<string[]>(data, 'filterBar.ports', []);
  const schemes = get<string[]>(data, 'filterBar.schemes', []);

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
      fieldName: 'observer.geo.name',
      id: 'location',
      isLoading,
      items: locations,
      onFilterFieldChange,
      selectedItems: getSelectedItems('observer.geo.name'),
      title: i18n.translate('xpack.uptime.filterBar.options.location.name', {
        defaultMessage: 'Location',
      }),
    },
    {
      fieldName: 'url.port',
      id: 'port',
      isLoading,
      items: ports,
      onFilterFieldChange,
      selectedItems: getSelectedItems('url.port'),
      title: i18n.translate('xpack.uptime.filterBar.options.portLabel', { defaultMessage: 'Port' }),
    },
    {
      fieldName: 'monitor.type',
      id: 'scheme',
      isLoading,
      items: schemes,
      onFilterFieldChange,
      selectedItems: getSelectedItems('monitor.type'),
      title: i18n.translate('xpack.uptime.filterBar.options.schemeLabel', {
        defaultMessage: 'Scheme',
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

export const FilterGroup = withUptimeGraphQL<FilterBarQueryResult, FilterBarDropdownsProps>(
  FilterGroupComponent,
  filterBarQuery
);

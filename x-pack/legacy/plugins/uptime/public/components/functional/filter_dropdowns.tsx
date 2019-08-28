/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFilterGroup } from '@elastic/eui';
import React from 'react';
import { get } from 'lodash';
import { FilterBar as FilterBarType } from '../../../common/graphql/types';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../higher_order';
import { filterBarQuery } from '../../queries';
import { FilterPopoverProps, FilterPopover } from './filter_popout';
import { FilterStatusButton } from '../filter_status_button';

interface FilterBarQueryResult {
  filters?: FilterBarType;
}

interface FilterBarDropdownsProps {
  currentKuery: string;
  onFilterKueryUpdate: (kuery: string) => void;
}

type Props = UptimeGraphQLQueryProps<FilterBarQueryResult> & FilterBarDropdownsProps;

export const FilterDropdownsComponent = ({
  loading: isLoading,
  currentKuery,
  data,
  onFilterKueryUpdate,
}: Props) => {
  const ids = get<string[]>(data, 'filterBar.ids', []);
  const locations = get<string[]>(data, 'filterBar.locations', []);
  const ports = get<string[]>(data, 'filterBar.ports', []);
  const schemes = get<string[]>(data, 'filterBar.schemes', []);
  const urls = get<string[]>(data, 'filterBar.urls', []);

  let filterKueries: Map<string, string[]>;
  try {
    filterKueries = new Map<string, string[]>(JSON.parse(currentKuery));
  } catch {
    filterKueries = new Map<string, string[]>();
  }

  const onKueryUpdate = (values: string[], fieldName: string) => {
    const nextFilterKueries = new Map<string, string[]>([...filterKueries]);
    nextFilterKueries.set(fieldName, values);
    Array.from(nextFilterKueries.keys()).forEach(key => {
      const value = nextFilterKueries.get(key);
      if (value && value.length === 0) {
        nextFilterKueries.delete(key);
      }
    });
    const kueryArray = Array.from(nextFilterKueries);
    let toPass;
    if (kueryArray.length === 0) {
      toPass = '';
    } else {
      toPass = JSON.stringify(kueryArray);
    }
    onFilterKueryUpdate(toPass);
  };

  const getSelectedItems = (fieldName: string) => filterKueries.get(fieldName) || [];

  const filterPopoverProps: FilterPopoverProps[] = [
    {
      fieldName: 'observer.geo.name',
      id: 'location',
      isLoading,
      items: locations,
      onKueryUpdate,
      selectedItems: getSelectedItems('observer.geo.name'),
      title: 'Location',
    },
    {
      fieldName: 'monitor.id',
      id: 'id',
      isLoading,
      items: ids,
      onKueryUpdate,
      selectedItems: getSelectedItems('monitor.id'),
      title: 'ID',
    },
    {
      fieldName: 'url.full',
      id: 'url',
      isLoading,
      items: urls,
      onKueryUpdate,
      selectedItems: getSelectedItems('url.full'),
      title: 'URL',
    },
    {
      fieldName: 'url.port',
      id: 'port',
      isLoading,
      items: ports,
      onKueryUpdate,
      selectedItems: getSelectedItems('url.port'),
      title: 'Port',
    },
    {
      fieldName: 'monitor.type',
      id: 'scheme',
      isLoading,
      items: schemes,
      onKueryUpdate,
      selectedItems: getSelectedItems('monitor.type'),
      title: 'Scheme',
    },
  ];

  return (
    <EuiFilterGroup>
      <FilterStatusButton content="Up" value="up" withNext={true} />
      <FilterStatusButton content="Down" value="down" withNext={false} />
      {filterPopoverProps.map(item => (
        <FilterPopover key={item.id} {...item} />
      ))}
    </EuiFilterGroup>
  );
};

export const FilterDropdowns = withUptimeGraphQL<FilterBarQueryResult, FilterBarDropdownsProps>(
  FilterDropdownsComponent,
  filterBarQuery
);

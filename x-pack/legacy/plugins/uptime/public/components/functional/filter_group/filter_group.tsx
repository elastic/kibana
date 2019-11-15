/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFilterGroup } from '@elastic/eui';
import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { connect } from 'react-redux';
import { FilterPopoverProps, FilterPopover } from './filter_popover';
import { FilterStatusButton } from './filter_status_button';
import { OverviewFilters } from '../../../../common/runtime_types';
import { fetchOverviewFilters } from '../../../state/actions';
import { AppState } from '../../../state';

interface OwnProps {
  currentFilter: any;
  onFilterUpdate: any;
  dateRangeStart: string;
  dateRangeEnd: string;
  filters?: string;
  statusFilter?: string;
}

interface StoreProps {
  lastRefresh: number;
  loading: boolean;
  overviewFilters: OverviewFilters;
}

interface DispatchProps {
  loadFilterGroup: typeof fetchOverviewFilters;
}

type Props = OwnProps & StoreProps & DispatchProps;

type PresentationalComponentProps = Pick<StoreProps, 'overviewFilters' | 'loading'> &
  Pick<OwnProps, 'currentFilter' | 'onFilterUpdate'>;

export const PresentationalComponent: React.FC<PresentationalComponentProps> = ({
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
      fieldName: 'observer.geo.name',
      id: 'location',
      loading,
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
      loading,
      items: ports.map((p: number) => p.toString()),
      onFilterFieldChange,
      selectedItems: getSelectedItems('url.port'),
      title: i18n.translate('xpack.uptime.filterBar.options.portLabel', { defaultMessage: 'Port' }),
    },
    {
      fieldName: 'monitor.type',
      id: 'scheme',
      loading,
      items: schemes,
      onFilterFieldChange,
      selectedItems: getSelectedItems('monitor.type'),
      title: i18n.translate('xpack.uptime.filterBar.options.schemeLabel', {
        defaultMessage: 'Scheme',
      }),
    },
    {
      fieldName: 'tags',
      id: 'tags',
      loading,
      items: tags,
      onFilterFieldChange,
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

export const Container: React.FC<Props> = ({
  currentFilter,
  filters,
  loading,
  loadFilterGroup,
  dateRangeStart,
  dateRangeEnd,
  overviewFilters,
  statusFilter,
  onFilterUpdate,
}: Props) => {
  useEffect(() => {
    loadFilterGroup(dateRangeStart, dateRangeEnd, filters, statusFilter);
  }, [dateRangeStart, dateRangeEnd, filters, statusFilter]);
  return (
    <PresentationalComponent
      currentFilter={currentFilter}
      overviewFilters={overviewFilters}
      loading={loading}
      onFilterUpdate={onFilterUpdate}
    />
  );
};

const mapStateToProps = ({
  overviewFilters: { loading, filters },
  ui: { lastRefresh },
}: AppState): StoreProps => ({
  overviewFilters: filters,
  lastRefresh,
  loading,
});

const mapDispatchToProps = (dispatch: any): DispatchProps => ({
  loadFilterGroup: (
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: string,
    statusFilter?: string
  ) => {
    return dispatch(fetchOverviewFilters(dateRangeStart, dateRangeEnd, filters, statusFilter));
  },
});

export const FilterGroup = connect<StoreProps, DispatchProps, OwnProps>(
  // @ts-ignore connect is expecting null | undefined for some reason
  mapStateToProps,
  mapDispatchToProps
)(Container);

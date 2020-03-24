/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect } from 'react';
import { connect } from 'react-redux';
import { useUrlParams } from '../../../hooks';
import { parseFiltersMap } from '../../functional/filter_group/parse_filter_map';
import { AppState } from '../../../state';
import { fetchOverviewFilters, GetOverviewFiltersPayload } from '../../../state/actions';
import { FilterGroupComponent } from '../../functional/filter_group';
import { OverviewFilters } from '../../../../common/runtime_types/overview_filters';
import { UptimeRefreshContext } from '../../../contexts';

interface OwnProps {
  esFilters?: string;
}

interface StoreProps {
  esKuery: string;
  lastRefresh: number;
  loading: boolean;
  overviewFilters: OverviewFilters;
}

interface DispatchProps {
  loadFilterGroup: typeof fetchOverviewFilters;
}

type Props = OwnProps & StoreProps & DispatchProps;

export const Container: React.FC<Props> = ({
  esKuery,
  esFilters,
  loading,
  loadFilterGroup,
  overviewFilters,
}: Props) => {
  const { lastRefresh } = useContext(UptimeRefreshContext);

  const [getUrlParams, updateUrl] = useUrlParams();
  const { dateRangeStart, dateRangeEnd, statusFilter, filters: urlFilters } = getUrlParams();

  useEffect(() => {
    const filterSelections = parseFiltersMap(urlFilters);
    loadFilterGroup({
      dateRangeStart,
      dateRangeEnd,
      locations: filterSelections.locations ?? [],
      ports: filterSelections.ports ?? [],
      schemes: filterSelections.schemes ?? [],
      search: esKuery,
      statusFilter,
      tags: filterSelections.tags ?? [],
    });
  }, [
    lastRefresh,
    dateRangeStart,
    dateRangeEnd,
    esKuery,
    esFilters,
    statusFilter,
    urlFilters,
    loadFilterGroup,
  ]);

  // update filters in the URL from filter group
  const onFilterUpdate = (filtersKuery: string) => {
    if (urlFilters !== filtersKuery) {
      updateUrl({ filters: filtersKuery, pagination: '' });
    }
  };

  return (
    <FilterGroupComponent
      currentFilter={urlFilters}
      overviewFilters={overviewFilters}
      loading={loading}
      onFilterUpdate={onFilterUpdate}
    />
  );
};

const mapStateToProps = ({
  overviewFilters: { loading, filters },
  ui: { esKuery, lastRefresh },
}: AppState): StoreProps => ({
  esKuery,
  overviewFilters: filters,
  lastRefresh,
  loading,
});

const mapDispatchToProps = (dispatch: any): DispatchProps => ({
  loadFilterGroup: (payload: GetOverviewFiltersPayload) => dispatch(fetchOverviewFilters(payload)),
});

export const FilterGroup = connect<StoreProps, DispatchProps, OwnProps>(
  // @ts-ignore connect is expecting null | undefined for some reason
  mapStateToProps,
  mapDispatchToProps
)(Container);

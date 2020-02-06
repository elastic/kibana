/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useCallback, useEffect, useMemo } from 'react';

import {
  ERROR_FETCHING_EVENTS_DATA,
  SHOWING,
  UNIT,
} from '../../../components/events_viewer/translations';
import { convertToBuildEsQuery } from '../../../lib/keury';
import { SetAbsoluteRangeDatePicker } from '../../network/types';
import { getTabsOnHostsUrl } from '../../../components/link_to/redirect_to_hosts';
import { MatrixHistogramContainer } from '../../../containers/matrix_histogram';
import { MatrixHistogramGqlQuery } from '../../../containers/matrix_histogram/index.gql_query';
import { eventsStackByOptions } from '../../hosts/navigation';
import { useKibana, useUiSetting$ } from '../../../lib/kibana';
import {
  esFilters,
  esQuery,
  IIndexPattern,
  Query,
} from '../../../../../../../../src/plugins/data/public';
import { inputsModel } from '../../../store';
import { HostsTableType, HostsType } from '../../../store/hosts/model';
import { DEFAULT_NUMBER_FORMAT } from '../../../../common/constants';

import * as i18n from '../translations';

const NO_FILTERS: esFilters.Filter[] = [];
const DEFAULT_QUERY: Query = { query: '', language: 'kuery' };
const DEFAULT_STACK_BY = 'event.dataset';

const ID = 'eventsByDatasetOverview';

interface Props {
  deleteQuery?: ({ id }: { id: string }) => void;
  filters?: esFilters.Filter[];
  from: number;
  indexPattern: IIndexPattern;
  query?: Query;
  setAbsoluteRangeDatePicker: SetAbsoluteRangeDatePicker;
  setQuery: (params: {
    id: string;
    inspect: inputsModel.InspectQuery | null;
    loading: boolean;
    refetch: inputsModel.Refetch;
  }) => void;
  to: number;
}

const EventsByDatasetComponent: React.FC<Props> = ({
  deleteQuery,
  filters = NO_FILTERS,
  from,
  indexPattern,
  query = DEFAULT_QUERY,
  setAbsoluteRangeDatePicker,
  setQuery,
  to,
}) => {
  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: ID });
      }
    };
  }, []);

  const kibana = useKibana();
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);

  const updateDateRangeCallback = useCallback(
    (min: number, max: number) => {
      setAbsoluteRangeDatePicker!({ id: 'global', from: min, to: max });
    },
    [setAbsoluteRangeDatePicker]
  );
  const eventsCountViewEventsButton = useMemo(
    () => <EuiButton href={getTabsOnHostsUrl(HostsTableType.events)}>{i18n.VIEW_EVENTS}</EuiButton>,
    []
  );

  const getSubtitle = useCallback(
    (totalCount: number) =>
      `${SHOWING}: ${numeral(totalCount).format(defaultNumberFormat)} ${UNIT(totalCount)}`,
    []
  );

  const defaultStackByOption =
    eventsStackByOptions.find(o => o.text === DEFAULT_STACK_BY) ?? eventsStackByOptions[0];

  const filterQuery = useMemo(
    () =>
      convertToBuildEsQuery({
        config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
        indexPattern,
        queries: [query],
        filters,
      }),
    [kibana, indexPattern, query, filters]
  );

  return (
    <MatrixHistogramContainer
      dataKey="EventsHistogram"
      defaultStackByOption={defaultStackByOption}
      endDate={to}
      errorMessage={ERROR_FETCHING_EVENTS_DATA}
      filterQuery={filterQuery}
      headerChildren={eventsCountViewEventsButton}
      id={ID}
      isEventsHistogram={true}
      legendPosition={'right'}
      query={MatrixHistogramGqlQuery}
      setQuery={setQuery}
      sourceId="default"
      stackByOptions={eventsStackByOptions}
      startDate={from}
      title={i18n.EVENTS}
      subtitle={getSubtitle}
      type={HostsType.page}
      updateDateRange={updateDateRangeCallback}
    />
  );
};

EventsByDatasetComponent.displayName = 'EventsByDatasetComponent';

export const EventsByDataset = React.memo(EventsByDatasetComponent);

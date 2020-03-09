/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useEffect, useMemo } from 'react';

import { Position } from '@elastic/charts';
import { SHOWING, UNIT } from '../../../components/events_viewer/translations';
import { convertToBuildEsQuery } from '../../../lib/keury';
import { getTabsOnHostsUrl } from '../../../components/link_to/redirect_to_hosts';
import { histogramConfigs } from '../../../pages/hosts/navigation/events_query_tab_body';
import { MatrixHistogramContainer } from '../../../components/matrix_histogram';
import { eventsStackByOptions } from '../../hosts/navigation';
import { useKibana, useUiSetting$ } from '../../../lib/kibana';
import {
  Filter,
  esQuery,
  IIndexPattern,
  Query,
} from '../../../../../../../../src/plugins/data/public';
import { inputsModel } from '../../../store';
import { HostsTableType, HostsType } from '../../../store/hosts/model';
import { DEFAULT_NUMBER_FORMAT } from '../../../../common/constants';

import * as i18n from '../translations';
import { MatrixHisrogramConfigs } from '../../../components/matrix_histogram/types';

const NO_FILTERS: Filter[] = [];
const DEFAULT_QUERY: Query = { query: '', language: 'kuery' };
const DEFAULT_STACK_BY = 'event.dataset';

const ID = 'eventsByDatasetOverview';

interface Props {
  deleteQuery?: ({ id }: { id: string }) => void;
  filters?: Filter[];
  from: number;
  indexPattern: IIndexPattern;
  query?: Query;
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
  setQuery,
  to,
}) => {
  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: ID });
      }
    };
  }, [deleteQuery]);

  const kibana = useKibana();
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);

  const eventsCountViewEventsButton = useMemo(
    () => <EuiButton href={getTabsOnHostsUrl(HostsTableType.events)}>{i18n.VIEW_EVENTS}</EuiButton>,
    []
  );

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

  const eventsByDatasetHistogramConfigs: MatrixHisrogramConfigs = useMemo(
    () => ({
      ...histogramConfigs,
      defaultStackByOption:
        eventsStackByOptions.find(o => o.text === DEFAULT_STACK_BY) ?? eventsStackByOptions[0],
      legendPosition: Position.Right,
      subtitle: (totalCount: number) =>
        `${SHOWING}: ${numeral(totalCount).format(defaultNumberFormat)} ${UNIT(totalCount)}`,
    }),
    []
  );

  return (
    <MatrixHistogramContainer
      endDate={to}
      filterQuery={filterQuery}
      headerChildren={eventsCountViewEventsButton}
      id={ID}
      setQuery={setQuery}
      sourceId="default"
      startDate={from}
      type={HostsType.page}
      {...eventsByDatasetHistogramConfigs}
    />
  );
};

EventsByDatasetComponent.displayName = 'EventsByDatasetComponent';

export const EventsByDataset = React.memo(EventsByDatasetComponent);

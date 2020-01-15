/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useCallback, useMemo } from 'react';
import { esFilters, IIndexPattern, Query } from 'src/plugins/data/public';
import styled from 'styled-components';

import {
  ERROR_FETCHING_ALERTS_DATA,
  SHOWING,
  UNIT,
} from '../../../components/alerts_viewer/translations';
import { alertsStackByOptions } from '../../../components/alerts_viewer';
import { getTabsOnHostsUrl } from '../../../components/link_to/redirect_to_hosts';
import { MatrixHistogramContainer } from '../../../containers/matrix_histogram';
import { MatrixHistogramGqlQuery } from '../../../containers/matrix_histogram/index.gql_query';
import { MatrixHistogramOption } from '../../../components/matrix_histogram/types';
import { useKibana, useUiSetting$ } from '../../../lib/kibana';
import { convertToBuildEsQuery } from '../../../lib/keury';
import { SetAbsoluteRangeDatePicker } from '../../network/types';
import { esQuery } from '../../../../../../../../src/plugins/data/public';
import { inputsModel } from '../../../store';
import { HostsTableType, HostsType } from '../../../store/hosts/model';
import { DEFAULT_NUMBER_FORMAT } from '../../../../common/constants';

import * as i18n from '../translations';

const ID = 'alertsByCategoryOverview';

const NO_FILTERS: esFilters.Filter[] = [];
const DEFAULT_QUERY: Query = { query: '', language: 'kuery' };

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

const ViewAlertsButton = styled(EuiButton)`
  margin-left: 8px;
`;

export const AlertsByCategory = React.memo<Props>(
  ({
    deleteQuery,
    filters = NO_FILTERS,
    from,
    indexPattern,
    query = DEFAULT_QUERY,
    setAbsoluteRangeDatePicker,
    setQuery,
    to,
  }) => {
    const kibana = useKibana();
    const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
    const updateDateRangeCallback = useCallback(
      (min: number, max: number) => {
        setAbsoluteRangeDatePicker!({ id: 'global', from: min, to: max });
      },
      [setAbsoluteRangeDatePicker]
    );
    const alertsCountViewAlertsButton = useMemo(
      () => (
        <ViewAlertsButton href={getTabsOnHostsUrl(HostsTableType.alerts)}>
          {i18n.VIEW_ALERTS}
        </ViewAlertsButton>
      ),
      []
    );

    const getTitle = useCallback(
      (option: MatrixHistogramOption) => i18n.ALERTS_COUNT_BY(option.text),
      []
    );
    const getSubtitle = useCallback(
      (totalCount: number) =>
        `${SHOWING}: ${numeral(totalCount).format(defaultNumberFormat)} ${UNIT(totalCount)}`,
      []
    );

    return (
      <MatrixHistogramContainer
        dataKey="AlertsHistogram"
        deleteQuery={deleteQuery}
        defaultStackByOption={alertsStackByOptions[0]}
        endDate={to}
        errorMessage={ERROR_FETCHING_ALERTS_DATA}
        filterQuery={convertToBuildEsQuery({
          config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
          indexPattern,
          queries: [query],
          filters,
        })}
        headerChildren={alertsCountViewAlertsButton}
        id={ID}
        isAlertsHistogram={true}
        legendPosition={'right'}
        query={MatrixHistogramGqlQuery}
        setQuery={setQuery}
        sourceId="default"
        stackByOptions={alertsStackByOptions}
        startDate={from}
        title={getTitle}
        subtitle={getSubtitle}
        type={HostsType.page}
        updateDateRange={updateDateRangeCallback}
      />
    );
  }
);

AlertsByCategory.displayName = 'AlertsByCategory';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useCallback, useEffect, useMemo } from 'react';

import { DEFAULT_NUMBER_FORMAT } from '../../../../common/constants';
import {
  ERROR_FETCHING_ALERTS_DATA,
  SHOWING,
  UNIT,
} from '../../../components/alerts_viewer/translations';
import { alertsStackByOptions } from '../../../components/alerts_viewer';
import { getDetectionEngineAlertUrl } from '../../../components/link_to/redirect_to_detection_engine';
import { MatrixHistogramContainer } from '../../../containers/matrix_histogram';
import { MatrixHistogramGqlQuery } from '../../../containers/matrix_histogram/index.gql_query';
import { useKibana, useUiSetting$ } from '../../../lib/kibana';
import { convertToBuildEsQuery } from '../../../lib/keury';
import { SetAbsoluteRangeDatePicker } from '../../network/types';
import {
  esFilters,
  esQuery,
  IIndexPattern,
  Query,
} from '../../../../../../../../src/plugins/data/public';
import { inputsModel } from '../../../store';
import { HostsType } from '../../../store/hosts/model';

import * as i18n from '../translations';

const ID = 'alertsByCategoryOverview';

const NO_FILTERS: esFilters.Filter[] = [];
const DEFAULT_QUERY: Query = { query: '', language: 'kuery' };
const DEFAULT_STACK_BY = 'event.module';

interface Props {
  deleteQuery?: ({ id }: { id: string }) => void;
  filters?: esFilters.Filter[];
  from: number;
  hideHeaderChildren?: boolean;
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

const AlertsByCategoryComponent: React.FC<Props> = ({
  deleteQuery,
  filters = NO_FILTERS,
  from,
  hideHeaderChildren = false,
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
  const alertsCountViewAlertsButton = useMemo(
    () => <EuiButton href={getDetectionEngineAlertUrl()}>{i18n.VIEW_ALERTS}</EuiButton>,
    []
  );

  const getSubtitle = useCallback(
    (totalCount: number) =>
      `${SHOWING}: ${numeral(totalCount).format(defaultNumberFormat)} ${UNIT(totalCount)}`,
    []
  );

  const defaultStackByOption =
    alertsStackByOptions.find(o => o.text === DEFAULT_STACK_BY) ?? alertsStackByOptions[0];

  return (
    <MatrixHistogramContainer
      dataKey="AlertsHistogram"
      defaultStackByOption={defaultStackByOption}
      endDate={to}
      errorMessage={ERROR_FETCHING_ALERTS_DATA}
      filterQuery={convertToBuildEsQuery({
        config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
        indexPattern,
        queries: [query],
        filters,
      })}
      headerChildren={hideHeaderChildren ? null : alertsCountViewAlertsButton}
      id={ID}
      isAlertsHistogram={true}
      legendPosition={'right'}
      query={MatrixHistogramGqlQuery}
      setQuery={setQuery}
      sourceId="default"
      stackByOptions={alertsStackByOptions}
      startDate={from}
      title={i18n.ALERTS_GRAPH_TITLE}
      subtitle={getSubtitle}
      type={HostsType.page}
      updateDateRange={updateDateRangeCallback}
    />
  );
};

AlertsByCategoryComponent.displayName = 'AlertsByCategoryComponent';

export const AlertsByCategory = React.memo(AlertsByCategoryComponent);

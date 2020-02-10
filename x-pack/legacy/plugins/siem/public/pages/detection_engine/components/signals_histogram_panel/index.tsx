/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Position } from '@elastic/charts';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSelect, EuiPanel } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import styled from 'styled-components';
import { isEmpty } from 'lodash/fp';

import { HeaderSection } from '../../../../components/header_section';
import { SignalsHistogram } from './signals_histogram';
import { Query } from '../../../../../../../../../src/plugins/data/common/query';
import { esFilters, esQuery } from '../../../../../../../../../src/plugins/data/common/es_query';
import { RegisterQuery, SignalsHistogramOption, SignalsAggregation, SignalsTotal } from './types';
import { signalsHistogramOptions } from './config';
import { getDetectionEngineUrl } from '../../../../components/link_to';
import { DEFAULT_NUMBER_FORMAT } from '../../../../../common/constants';
import { useKibana, useUiSetting$ } from '../../../../lib/kibana';
import { InspectButtonContainer } from '../../../../components/inspect';
import { useQuerySignals } from '../../../../containers/detection_engine/signals/use_query';
import { MatrixLoader } from '../../../../components/matrix_histogram/matrix_loader';

import { formatSignalsData, getSignalsHistogramQuery, showInitialLoadingSpinner } from './helpers';
import * as i18n from './translations';

const DEFAULT_PANEL_HEIGHT = 300;

const StyledEuiPanel = styled(EuiPanel)<{ height?: number }>`
  display: flex;
  flex-direction: column;
  ${({ height }) => (height != null ? `height: ${height}px;` : '')}
  position: relative;
`;

const defaultTotalSignalsObj: SignalsTotal = {
  value: 0,
  relation: 'eq',
};

export const DETECTIONS_HISTOGRAM_ID = 'detections-histogram';

const ViewSignalsFlexItem = styled(EuiFlexItem)`
  margin-left: 24px;
`;

interface SignalsHistogramPanelProps {
  chartHeight?: number;
  defaultStackByOption?: SignalsHistogramOption;
  deleteQuery?: ({ id }: { id: string }) => void;
  filters?: esFilters.Filter[];
  from: number;
  query?: Query;
  legendPosition?: Position;
  panelHeight?: number;
  signalIndexName: string | null;
  setQuery: (params: RegisterQuery) => void;
  showLinkToSignals?: boolean;
  showTotalSignalsCount?: boolean;
  stackByOptions?: SignalsHistogramOption[];
  title?: string;
  to: number;
  updateDateRange: (min: number, max: number) => void;
}

export const SignalsHistogramPanel = memo<SignalsHistogramPanelProps>(
  ({
    chartHeight,
    defaultStackByOption = signalsHistogramOptions[0],
    deleteQuery,
    filters,
    query,
    from,
    legendPosition = 'right',
    panelHeight = DEFAULT_PANEL_HEIGHT,
    setQuery,
    signalIndexName,
    showLinkToSignals = false,
    showTotalSignalsCount = false,
    stackByOptions,
    to,
    title = i18n.HISTOGRAM_HEADER,
    updateDateRange,
  }) => {
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
    const [totalSignalsObj, setTotalSignalsObj] = useState<SignalsTotal>(defaultTotalSignalsObj);
    const [selectedStackByOption, setSelectedStackByOption] = useState<SignalsHistogramOption>(
      defaultStackByOption
    );
    const {
      loading: isLoadingSignals,
      data: signalsData,
      setQuery: setSignalsQuery,
      response,
      request,
      refetch,
    } = useQuerySignals<{}, SignalsAggregation>(
      getSignalsHistogramQuery(selectedStackByOption.value, from, to, []),
      signalIndexName
    );
    const kibana = useKibana();

    const totalSignals = useMemo(
      () =>
        i18n.SHOWING_SIGNALS(
          numeral(totalSignalsObj.value).format(defaultNumberFormat),
          totalSignalsObj.value,
          totalSignalsObj.relation === 'gte' ? '>' : totalSignalsObj.relation === 'lte' ? '<' : ''
        ),
      [totalSignalsObj]
    );

    const setSelectedOptionCallback = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedStackByOption(
        stackByOptions?.find(co => co.value === event.target.value) ?? defaultStackByOption
      );
    }, []);

    const formattedSignalsData = useMemo(() => formatSignalsData(signalsData), [signalsData]);

    useEffect(() => {
      let canceled = false;

      if (!canceled && !showInitialLoadingSpinner({ isInitialLoading, isLoadingSignals })) {
        setIsInitialLoading(false);
      }

      return () => {
        canceled = true; // prevent long running data fetches from updating state after unmounting
      };
    }, [isInitialLoading, isLoadingSignals, setIsInitialLoading]);

    useEffect(() => {
      return () => {
        if (deleteQuery) {
          deleteQuery({ id: DETECTIONS_HISTOGRAM_ID });
        }
      };
    }, []);

    useEffect(() => {
      if (refetch != null && setQuery != null) {
        setQuery({
          id: DETECTIONS_HISTOGRAM_ID,
          inspect: {
            dsl: [request],
            response: [response],
          },
          loading: isLoadingSignals,
          refetch,
        });
      }
    }, [setQuery, isLoadingSignals, signalsData, response, request, refetch]);

    useEffect(() => {
      setTotalSignalsObj(
        signalsData?.hits.total ?? {
          value: 0,
          relation: 'eq',
        }
      );
    }, [signalsData]);

    useEffect(() => {
      const converted = esQuery.buildEsQuery(
        undefined,
        query != null ? [query] : [],
        filters?.filter(f => f.meta.disabled === false) ?? [],
        {
          ...esQuery.getEsQueryConfig(kibana.services.uiSettings),
          dateFormatTZ: undefined,
        }
      );

      setSignalsQuery(
        getSignalsHistogramQuery(
          selectedStackByOption.value,
          from,
          to,
          !isEmpty(converted) ? [converted] : []
        )
      );
    }, [selectedStackByOption.value, from, to, query, filters]);

    return (
      <InspectButtonContainer show={!isInitialLoading}>
        <StyledEuiPanel height={panelHeight}>
          {isInitialLoading ? (
            <>
              <HeaderSection id={DETECTIONS_HISTOGRAM_ID} title={title} />
              <MatrixLoader />
            </>
          ) : (
            <>
              <HeaderSection
                id={DETECTIONS_HISTOGRAM_ID}
                title={title}
                subtitle={showTotalSignalsCount && totalSignals}
              >
                <EuiFlexGroup alignItems="center" gutterSize="none">
                  <EuiFlexItem grow={false}>
                    {stackByOptions && (
                      <EuiSelect
                        onChange={setSelectedOptionCallback}
                        options={stackByOptions}
                        prepend={i18n.STACK_BY_LABEL}
                        value={selectedStackByOption.value}
                      />
                    )}
                  </EuiFlexItem>
                  {showLinkToSignals && (
                    <ViewSignalsFlexItem grow={false}>
                      <EuiButton href={getDetectionEngineUrl()}>{i18n.VIEW_SIGNALS}</EuiButton>
                    </ViewSignalsFlexItem>
                  )}
                </EuiFlexGroup>
              </HeaderSection>

              <SignalsHistogram
                chartHeight={chartHeight}
                data={formattedSignalsData}
                from={from}
                legendPosition={legendPosition}
                loading={isLoadingSignals}
                to={to}
                updateDateRange={updateDateRange}
              />
            </>
          )}
        </StyledEuiPanel>
      </InspectButtonContainer>
    );
  }
);

SignalsHistogramPanel.displayName = 'SignalsHistogramPanel';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { StickyContainer } from 'react-sticky';
import { connect, ConnectedProps } from 'react-redux';

import { GlobalTime } from '../../containers/global_time';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { AlertsTable } from '../../components/alerts_viewer/alerts_table';
import { FiltersGlobal } from '../../components/filters_global';
import {
  getDetectionEngineTabUrl,
  getRulesUrl,
} from '../../components/link_to/redirect_to_detection_engine';
import { SiemSearchBar } from '../../components/search_bar';
import { WrapperPage } from '../../components/wrapper_page';
import { SiemNavigation } from '../../components/navigation';
import { NavTab } from '../../components/navigation/types';
import { State } from '../../store';
import { inputsSelectors } from '../../store/inputs';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { SpyRoute } from '../../utils/route/spy_routes';
import { InputsRange } from '../../store/inputs/model';
import { AlertsByCategory } from '../overview/alerts_by_category';
import { useSignalInfo } from './components/signals_info';
import { SignalsTable } from './components/signals';
import { NoApiIntegrationKeyCallOut } from './components/no_api_integration_callout';
import { NoWriteSignalsCallOut } from './components/no_write_signals_callout';
import { SignalsHistogramPanel } from './components/signals_histogram_panel';
import { signalsHistogramOptions } from './components/signals_histogram_panel/config';
import { useUserInfo } from './components/user_info';
import { DetectionEngineEmptyPage } from './detection_engine_empty_page';
import { DetectionEngineNoIndex } from './detection_engine_no_signal_index';
import { DetectionEngineHeaderPage } from './components/detection_engine_header_page';
import { DetectionEngineUserUnauthenticated } from './detection_engine_user_unauthenticated';
import * as i18n from './translations';
import { DetectionEngineTab } from './types';

const detectionsTabs: Record<string, NavTab> = {
  [DetectionEngineTab.signals]: {
    id: DetectionEngineTab.signals,
    name: i18n.SIGNAL,
    href: getDetectionEngineTabUrl(DetectionEngineTab.signals),
    disabled: false,
    urlKey: 'detections',
  },
  [DetectionEngineTab.alerts]: {
    id: DetectionEngineTab.alerts,
    name: i18n.ALERT,
    href: getDetectionEngineTabUrl(DetectionEngineTab.alerts),
    disabled: false,
    urlKey: 'detections',
  },
};

const DetectionEnginePageComponent: React.FC<PropsFromRedux> = ({
  filters,
  query,
  setAbsoluteRangeDatePicker,
}) => {
  const { tabName = DetectionEngineTab.signals } = useParams();
  const {
    loading,
    isSignalIndexExists,
    isAuthenticated: isUserAuthenticated,
    hasEncryptionKey,
    canUserCRUD,
    signalIndexName,
    hasIndexWrite,
  } = useUserInfo();

  const [lastSignals] = useSignalInfo({});

  const updateDateRangeCallback = useCallback(
    (min: number, max: number) => {
      setAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
    },
    [setAbsoluteRangeDatePicker]
  );

  const indexToAdd = useMemo(() => (signalIndexName == null ? [] : [signalIndexName]), [
    signalIndexName,
  ]);

  if (isUserAuthenticated != null && !isUserAuthenticated && !loading) {
    return (
      <WrapperPage>
        <DetectionEngineHeaderPage border title={i18n.PAGE_TITLE} />
        <DetectionEngineUserUnauthenticated />
      </WrapperPage>
    );
  }
  if (isSignalIndexExists != null && !isSignalIndexExists && !loading) {
    return (
      <WrapperPage>
        <DetectionEngineHeaderPage border title={i18n.PAGE_TITLE} />
        <DetectionEngineNoIndex />
      </WrapperPage>
    );
  }

  return (
    <>
      {hasEncryptionKey != null && !hasEncryptionKey && <NoApiIntegrationKeyCallOut />}
      {hasIndexWrite != null && !hasIndexWrite && <NoWriteSignalsCallOut />}
      <WithSource sourceId="default" indexToAdd={indexToAdd}>
        {({ indicesExist, indexPattern }) => {
          return indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
            <StickyContainer>
              <FiltersGlobal>
                <SiemSearchBar id="global" indexPattern={indexPattern} />
              </FiltersGlobal>
              <WrapperPage>
                <DetectionEngineHeaderPage
                  subtitle={
                    lastSignals != null && (
                      <>
                        {i18n.LAST_SIGNAL}
                        {': '}
                        {lastSignals}
                      </>
                    )
                  }
                  title={i18n.PAGE_TITLE}
                >
                  <EuiButton fill href={getRulesUrl()} iconType="gear">
                    {i18n.BUTTON_MANAGE_RULES}
                  </EuiButton>
                </DetectionEngineHeaderPage>

                <GlobalTime>
                  {({ to, from, deleteQuery, setQuery }) => (
                    <>
                      <SiemNavigation navTabs={detectionsTabs} />
                      <EuiSpacer />
                      {tabName === DetectionEngineTab.signals && (
                        <>
                          <SignalsHistogramPanel
                            deleteQuery={deleteQuery}
                            filters={filters}
                            from={from}
                            query={query}
                            setQuery={setQuery}
                            showTotalSignalsCount={true}
                            signalIndexName={signalIndexName}
                            stackByOptions={signalsHistogramOptions}
                            to={to}
                            updateDateRange={updateDateRangeCallback}
                          />
                          <EuiSpacer size="l" />
                          <SignalsTable
                            loading={loading}
                            hasIndexWrite={hasIndexWrite ?? false}
                            canUserCRUD={(canUserCRUD ?? false) && (hasEncryptionKey ?? false)}
                            from={from}
                            signalsIndex={signalIndexName ?? ''}
                            to={to}
                          />
                        </>
                      )}
                      {tabName === DetectionEngineTab.alerts && (
                        <>
                          <AlertsByCategory
                            deleteQuery={deleteQuery}
                            filters={filters}
                            from={from}
                            hideHeaderChildren={true}
                            indexPattern={indexPattern}
                            query={query}
                            setQuery={setQuery}
                            to={to}
                          />
                          <AlertsTable endDate={to} startDate={from} />
                        </>
                      )}
                    </>
                  )}
                </GlobalTime>
              </WrapperPage>
            </StickyContainer>
          ) : (
            <WrapperPage>
              <DetectionEngineHeaderPage border title={i18n.PAGE_TITLE} />
              <DetectionEngineEmptyPage />
            </WrapperPage>
          );
        }}
      </WithSource>
      <SpyRoute />
    </>
  );
};

const makeMapStateToProps = () => {
  const getGlobalInputs = inputsSelectors.globalSelector();
  return (state: State) => {
    const globalInputs: InputsRange = getGlobalInputs(state);
    const { query, filters } = globalInputs;

    return {
      query,
      filters,
    };
  };
};

const mapDispatchToProps = {
  setAbsoluteRangeDatePicker: dispatchSetAbsoluteRangeDatePicker,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const DetectionEnginePage = connector(React.memo(DetectionEnginePageComponent));

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiSpacer } from '@elastic/eui';
import React, { useCallback } from 'react';
import { StickyContainer } from 'react-sticky';

import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';
import { FiltersGlobal } from '../../components/filters_global';
import { HeaderPage } from '../../components/header_page';
import { SiemSearchBar } from '../../components/search_bar';
import { WrapperPage } from '../../components/wrapper_page';
import { GlobalTime } from '../../containers/global_time';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { SpyRoute } from '../../utils/route/spy_routes';

import { Query } from '../../../../../../../src/plugins/data/common/query';
import { esFilters } from '../../../../../../../src/plugins/data/common/es_query';
import { State } from '../../store';
import { inputsSelectors } from '../../store/inputs';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { InputsModelId } from '../../store/inputs/constants';
import { InputsRange } from '../../store/inputs/model';
import { useSignalInfo } from './components/signals_info';
import { SignalsTable } from './components/signals';
import { NoWriteSignalsCallOut } from './components/no_write_signals_callout';
import { SignalsHistogramPanel } from './components/signals_histogram_panel';
import { signalsHistogramOptions } from './components/signals_histogram_panel/config';
import { useUserInfo } from './components/user_info';
import { DetectionEngineEmptyPage } from './detection_engine_empty_page';
import { DetectionEngineNoIndex } from './detection_engine_no_signal_index';
import { DetectionEngineUserUnauthenticated } from './detection_engine_user_unauthenticated';
import * as i18n from './translations';

interface ReduxProps {
  filters: esFilters.Filter[];
  query: Query;
}

export interface DispatchProps {
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>;
}

type DetectionEngineComponentProps = ReduxProps & DispatchProps;

const DetectionEngineComponent = React.memo<DetectionEngineComponentProps>(
  ({ filters, query, setAbsoluteRangeDatePicker }) => {
    const {
      loading,
      isSignalIndexExists,
      isAuthenticated: isUserAuthenticated,
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

    if (isUserAuthenticated != null && !isUserAuthenticated && !loading) {
      return (
        <WrapperPage>
          <HeaderPage border title={i18n.PAGE_TITLE} />
          <DetectionEngineUserUnauthenticated />
        </WrapperPage>
      );
    }
    if (isSignalIndexExists != null && !isSignalIndexExists && !loading) {
      return (
        <WrapperPage>
          <HeaderPage border title={i18n.PAGE_TITLE} />
          <DetectionEngineNoIndex />
        </WrapperPage>
      );
    }
    return (
      <>
        {hasIndexWrite != null && !hasIndexWrite && <NoWriteSignalsCallOut />}
        <WithSource sourceId="default">
          {({ indicesExist, indexPattern }) => {
            return indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
              <StickyContainer>
                <FiltersGlobal>
                  <SiemSearchBar id="global" indexPattern={indexPattern} />
                </FiltersGlobal>
                <WrapperPage>
                  <HeaderPage
                    border
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
                    <EuiButton fill href="#/detection-engine/rules" iconType="gear">
                      {i18n.BUTTON_MANAGE_RULES}
                    </EuiButton>
                  </HeaderPage>

                  <GlobalTime>
                    {({ to, from }) => (
                      <>
                        <SignalsHistogramPanel
                          filters={filters}
                          from={from}
                          loadingInitial={loading}
                          query={query}
                          stackByOptions={signalsHistogramOptions}
                          to={to}
                          updateDateRange={updateDateRangeCallback}
                        />
                        <EuiSpacer />
                        <SignalsTable
                          loading={loading}
                          hasIndexWrite={hasIndexWrite ?? false}
                          canUserCRUD={canUserCRUD ?? false}
                          from={from}
                          signalsIndex={signalIndexName ?? ''}
                          to={to}
                        />
                      </>
                    )}
                  </GlobalTime>
                </WrapperPage>
              </StickyContainer>
            ) : (
              <WrapperPage>
                <HeaderPage border title={i18n.PAGE_TITLE} />
                <DetectionEngineEmptyPage />
              </WrapperPage>
            );
          }}
        </WithSource>
        <SpyRoute />
      </>
    );
  }
);
DetectionEngineComponent.displayName = 'DetectionEngineComponent';

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

export const DetectionEngine = connect(makeMapStateToProps, {
  setAbsoluteRangeDatePicker: dispatchSetAbsoluteRangeDatePicker,
})(DetectionEngineComponent);

DetectionEngine.displayName = 'DetectionEngine';

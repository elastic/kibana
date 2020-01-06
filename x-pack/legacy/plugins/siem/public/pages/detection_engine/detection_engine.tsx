/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiSpacer, EuiPanel, EuiLoadingContent } from '@elastic/eui';
import React from 'react';
import { StickyContainer } from 'react-sticky';

import { connect } from 'react-redux';
import { FiltersGlobal } from '../../components/filters_global';
import { HeaderPage } from '../../components/header_page';
import { SiemSearchBar } from '../../components/search_bar';
import { WrapperPage } from '../../components/wrapper_page';
import { GlobalTime } from '../../containers/global_time';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { SpyRoute } from '../../utils/route/spy_routes';

import { SignalsTable } from './components/signals';
import * as signalsI18n from './components/signals/translations';
import { SignalsHistogramPanel } from './components/signals_histogram_panel';
import { Query } from '../../../../../../../src/plugins/data/common/query';
import { esFilters } from '../../../../../../../src/plugins/data/common/es_query';
import { inputsSelectors } from '../../store/inputs';
import { State } from '../../store';
import { InputsRange } from '../../store/inputs/model';
import { signalsHistogramOptions } from './components/signals_histogram_panel/config';
import { useSignalInfo } from './components/signals_info';
import { DetectionEngineEmptyPage } from './detection_engine_empty_page';
import { DetectionEngineNoIndex } from './detection_engine_no_signal_index';
import { DetectionEngineUserUnauthenticated } from './detection_engine_user_unauthenticated';
import * as i18n from './translations';
import { HeaderSection } from '../../components/header_section';

interface ReduxProps {
  filters: esFilters.Filter[];
  query: Query;
}

interface OwnProps {
  loading: boolean;
  isSignalIndexExists: boolean | null;
  isUserAuthenticated: boolean | null;
  signalsIndex: string | null;
}

type DetectionEngineComponentProps = OwnProps & ReduxProps;

export const DetectionEngineComponent = React.memo<DetectionEngineComponentProps>(
  ({ filters, loading, isSignalIndexExists, isUserAuthenticated, query, signalsIndex }) => {
    const [lastSignals] = useSignalInfo({});
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
                          query={query}
                          stackByOptions={signalsHistogramOptions}
                          to={to}
                        />
                        <EuiSpacer />

                        {!loading ? (
                          isSignalIndexExists && (
                            <SignalsTable from={from} signalsIndex={signalsIndex ?? ''} to={to} />
                          )
                        ) : (
                          <EuiPanel>
                            <HeaderSection title={signalsI18n.SIGNALS_TABLE_TITLE} />
                            <EuiLoadingContent />
                          </EuiPanel>
                        )}
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

export const DetectionEngine = connect(makeMapStateToProps, {})(DetectionEngineComponent);

DetectionEngine.displayName = 'DetectionEngine';

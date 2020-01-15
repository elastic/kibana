/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import { StickyContainer } from 'react-sticky';
import { compose } from 'redux';
import { Query, esFilters } from 'src/plugins/data/public';
import styled from 'styled-components';

import { AlertsByCategory } from './alerts_by_category';
import { FiltersGlobal } from '../../components/filters_global';
import { HeaderPage } from '../../components/header_page';
import { SiemSearchBar } from '../../components/search_bar';
import { WrapperPage } from '../../components/wrapper_page';
import { GlobalTime } from '../../containers/global_time';
import { WithSource, indicesExistOrDataTemporarilyUnavailable } from '../../containers/source';
import { EventsByDataset } from './events_by_dataset';
import { EventCounts } from './event_counts';
import { SetAbsoluteRangeDatePicker } from '../network/types';
import { OverviewEmpty } from './overview_empty';
import { StatefulSidebar } from './sidebar';
import { SignalsByCategory } from './signals_by_category';
import { inputsSelectors, State } from '../../store';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { SpyRoute } from '../../utils/route/spy_routes';

import * as i18n from './translations';

const DEFAULT_QUERY: Query = { query: '', language: 'kuery' };
const NO_FILTERS: esFilters.Filter[] = [];
const SidebarFlexItem = styled(EuiFlexItem)`
  margin-right: 24px;
`;

interface OverviewComponentReduxProps {
  query?: Query;
  filters?: esFilters.Filter[];
  setAbsoluteRangeDatePicker?: SetAbsoluteRangeDatePicker;
}

const OverviewComponent = React.memo<OverviewComponentReduxProps>(
  ({ filters = NO_FILTERS, query = DEFAULT_QUERY, setAbsoluteRangeDatePicker }) => (
    <>
      <WithSource sourceId="default">
        {({ indicesExist, indexPattern }) =>
          indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
            <StickyContainer>
              <FiltersGlobal>
                <SiemSearchBar id="global" indexPattern={indexPattern} />
              </FiltersGlobal>

              <WrapperPage>
                <HeaderPage border title={i18n.PAGE_TITLE} />

                <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
                  <SidebarFlexItem grow={false}>
                    <StatefulSidebar />
                  </SidebarFlexItem>

                  <EuiFlexItem grow={true}>
                    <GlobalTime>
                      {({ from, deleteQuery, setQuery, to }) => (
                        <>
                          <EventsByDataset
                            deleteQuery={deleteQuery}
                            filters={filters}
                            from={from}
                            indexPattern={indexPattern}
                            query={query}
                            setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker!}
                            setQuery={setQuery}
                            to={to}
                          />

                          <EuiSpacer size="l" />

                          <EventCounts
                            filters={filters}
                            from={from}
                            indexPattern={indexPattern}
                            query={query}
                            setQuery={setQuery}
                            to={to}
                          />

                          <EuiSpacer size="l" />

                          <AlertsByCategory
                            deleteQuery={deleteQuery}
                            filters={filters}
                            from={from}
                            indexPattern={indexPattern}
                            query={query}
                            setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker!}
                            setQuery={setQuery}
                            to={to}
                          />

                          <EuiSpacer size="l" />

                          <SignalsByCategory
                            filters={filters}
                            from={from}
                            indexPattern={indexPattern}
                            query={query}
                            setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker!}
                            setQuery={setQuery}
                            to={to}
                          />
                        </>
                      )}
                    </GlobalTime>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </WrapperPage>
            </StickyContainer>
          ) : (
            <OverviewEmpty />
          )
        }
      </WithSource>

      <SpyRoute />
    </>
  )
);

OverviewComponent.displayName = 'OverviewComponent';

const makeMapStateToProps = () => {
  const getGlobalFiltersQuerySelector = inputsSelectors.globalFiltersQuerySelector();
  const getGlobalQuerySelector = inputsSelectors.globalQuerySelector();

  const mapStateToProps = (state: State): OverviewComponentReduxProps => ({
    query: getGlobalQuerySelector(state),
    filters: getGlobalFiltersQuerySelector(state),
  });

  return mapStateToProps;
};

export const StatefulOverview = compose<React.ComponentClass<OverviewComponentReduxProps>>(
  connect(makeMapStateToProps, { setAbsoluteRangeDatePicker: dispatchSetAbsoluteRangeDatePicker })
)(OverviewComponent);

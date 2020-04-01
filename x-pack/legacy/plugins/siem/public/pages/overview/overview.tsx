/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { StickyContainer } from 'react-sticky';
import { Query, Filter } from 'src/plugins/data/public';
import styled from 'styled-components';

import { AlertsByCategory } from './alerts_by_category';
import { FiltersGlobal } from '../../components/filters_global';
import { SiemSearchBar } from '../../components/search_bar';
import { WrapperPage } from '../../components/wrapper_page';
import { GlobalTime } from '../../containers/global_time';
import { WithSource, indicesExistOrDataTemporarilyUnavailable } from '../../containers/source';
import { EventsByDataset } from './events_by_dataset';
import { EventCounts } from './event_counts';
import { OverviewEmpty } from './overview_empty';
import { StatefulSidebar } from './sidebar';
import { SignalsByCategory } from './signals_by_category';
import { inputsSelectors, State } from '../../store';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { SpyRoute } from '../../utils/route/spy_routes';

const DEFAULT_QUERY: Query = { query: '', language: 'kuery' };
const NO_FILTERS: Filter[] = [];

const SidebarFlexItem = styled(EuiFlexItem)`
  margin-right: 24px;
`;

const OverviewComponent: React.FC<PropsFromRedux> = ({
  filters = NO_FILTERS,
  query = DEFAULT_QUERY,
  setAbsoluteRangeDatePicker,
}) => (
  <>
    <WithSource sourceId="default">
      {({ indicesExist, indexPattern }) =>
        indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
          <StickyContainer>
            <FiltersGlobal>
              <SiemSearchBar id="global" indexPattern={indexPattern} />
            </FiltersGlobal>

            <WrapperPage>
              <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
                <SidebarFlexItem grow={false}>
                  <StatefulSidebar />
                </SidebarFlexItem>

                <EuiFlexItem grow={true}>
                  <GlobalTime>
                    {({ from, deleteQuery, setQuery, to }) => (
                      <EuiFlexGroup direction="column" gutterSize="none">
                        <EuiFlexItem grow={false}>
                          <SignalsByCategory
                            filters={filters}
                            from={from}
                            indexPattern={indexPattern}
                            query={query}
                            setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker!}
                            setQuery={setQuery}
                            to={to}
                          />
                          <EuiSpacer size="l" />
                        </EuiFlexItem>

                        <EuiFlexItem grow={false}>
                          <AlertsByCategory
                            deleteQuery={deleteQuery}
                            filters={filters}
                            from={from}
                            indexPattern={indexPattern}
                            query={query}
                            setQuery={setQuery}
                            to={to}
                          />
                        </EuiFlexItem>

                        <EuiFlexItem grow={false}>
                          <EventsByDataset
                            deleteQuery={deleteQuery}
                            filters={filters}
                            from={from}
                            indexPattern={indexPattern}
                            query={query}
                            setQuery={setQuery}
                            to={to}
                          />
                        </EuiFlexItem>

                        <EuiFlexItem grow={false}>
                          <EventCounts
                            filters={filters}
                            from={from}
                            indexPattern={indexPattern}
                            query={query}
                            setQuery={setQuery}
                            to={to}
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
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
);

const makeMapStateToProps = () => {
  const getGlobalFiltersQuerySelector = inputsSelectors.globalFiltersQuerySelector();
  const getGlobalQuerySelector = inputsSelectors.globalQuerySelector();

  const mapStateToProps = (state: State) => ({
    query: getGlobalQuerySelector(state),
    filters: getGlobalFiltersQuerySelector(state),
  });

  return mapStateToProps;
};

const mapDispatchToProps = { setAbsoluteRangeDatePicker: dispatchSetAbsoluteRangeDatePicker };

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulOverview = connector(React.memo(OverviewComponent));

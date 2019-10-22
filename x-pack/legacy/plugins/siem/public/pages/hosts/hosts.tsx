/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import { Filter, getEsQueryConfig } from '@kbn/es-query';
import * as React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { StickyContainer } from 'react-sticky';
import { ActionCreator } from 'typescript-fsa';
import { Query } from 'src/plugins/data/common';

import { FiltersGlobal } from '../../components/filters_global';
import { GlobalTimeArgs } from '../../containers/global_time';
import { HeaderPage } from '../../components/header_page';
import { KpiHostsQuery } from '../../containers/kpi_hosts';
import { LastEventTime } from '../../components/last_event_time';
import { SiemNavigation } from '../../components/navigation';
import { KpiHostsComponent } from '../../components/page/hosts';
import { manageQuery } from '../../components/page/manage_query';
import { hasMlUserPermissions } from '../../components/ml/permissions/has_ml_user_permissions';
import { MlCapabilitiesContext } from '../../components/ml/permissions/ml_capabilities_provider';
import { SiemSearchBar } from '../../components/search_bar';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { LastEventIndexKey } from '../../graphql/types';
import { convertToBuildEsQuery } from '../../lib/keury';
import { inputsSelectors, State } from '../../store';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { InputsModelId } from '../../store/inputs/constants';
import { SpyRoute } from '../../utils/route/spy_routes';

import { HostsEmptyPage } from './hosts_empty_page';
import { navTabsHosts } from './nav_tabs';
import * as i18n from './translations';
import { useKibanaCore } from '../../lib/compose/kibana_core';

const KpiHostsComponentManage = manageQuery(KpiHostsComponent);

interface HostsComponentReduxProps {
  query: Query;
  filters: Filter[];
}

interface HostsComponentDispatchProps {
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>;
}

export type HostsQueryProps = { timezone?: string } & GlobalTimeArgs;

export type HostsComponentProps = HostsComponentReduxProps &
  HostsComponentDispatchProps &
  HostsQueryProps;

const HostsComponent = React.memo<HostsComponentProps>(
  ({ isInitializing, filters, from, query, setAbsoluteRangeDatePicker, setQuery, to }) => {
    const capabilities = React.useContext(MlCapabilitiesContext);
    const core = useKibanaCore();
    return (
      <>
        <WithSource sourceId="default">
          {({ indicesExist, indexPattern }) => {
            const filterQuery = convertToBuildEsQuery({
              config: getEsQueryConfig(core.uiSettings),
              indexPattern,
              queries: [query],
              filters,
            });
            return indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
              <StickyContainer>
                <FiltersGlobal>
                  <SiemSearchBar indexPattern={indexPattern} id="global" />
                </FiltersGlobal>

                <HeaderPage
                  subtitle={<LastEventTime indexKey={LastEventIndexKey.hosts} />}
                  title={i18n.PAGE_TITLE}
                />
                <>
                  <KpiHostsQuery
                    endDate={to}
                    filterQuery={filterQuery}
                    skip={isInitializing}
                    sourceId="default"
                    startDate={from}
                  >
                    {({ kpiHosts, loading, id, inspect, refetch }) => (
                      <KpiHostsComponentManage
                        data={kpiHosts}
                        from={from}
                        id={id}
                        inspect={inspect}
                        loading={loading}
                        refetch={refetch}
                        setQuery={setQuery}
                        to={to}
                        narrowDateRange={(min: number, max: number) => {
                          setAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
                        }}
                      />
                    )}
                  </KpiHostsQuery>
                  <EuiSpacer />
                  <SiemNavigation
                    navTabs={navTabsHosts(hasMlUserPermissions(capabilities))}
                    display="default"
                    showBorder={true}
                  />
                  <EuiSpacer />
                </>
              </StickyContainer>
            ) : (
              <>
                <HeaderPage title={i18n.PAGE_TITLE} />
                <HostsEmptyPage />
              </>
            );
          }}
        </WithSource>
        <SpyRoute />
      </>
    );
  }
);

HostsComponent.displayName = 'HostsComponent';

const makeMapStateToProps = () => {
  const getGlobalQuerySelector = inputsSelectors.globalQuerySelector();
  const getGlobalFiltersQuerySelector = inputsSelectors.globalFiltersQuerySelector();
  const mapStateToProps = (state: State): HostsComponentReduxProps => ({
    query: getGlobalQuerySelector(state),
    filters: getGlobalFiltersQuerySelector(state),
  });

  return mapStateToProps;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Hosts = compose<React.ComponentClass<GlobalTimeArgs>>(
  connect(
    makeMapStateToProps,
    {
      setAbsoluteRangeDatePicker: dispatchSetAbsoluteRangeDatePicker,
    }
  )
)(HostsComponent);

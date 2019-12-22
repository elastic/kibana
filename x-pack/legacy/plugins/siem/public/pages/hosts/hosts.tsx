/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useCallback } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { StickyContainer } from 'react-sticky';

import { useParams } from 'react-router-dom';
import { FiltersGlobal } from '../../components/filters_global';
import { HeaderPage } from '../../components/header_page';
import { LastEventTime } from '../../components/last_event_time';
import { hasMlUserPermissions } from '../../components/ml/permissions/has_ml_user_permissions';
import { MlCapabilitiesContext } from '../../components/ml/permissions/ml_capabilities_provider';
import { SiemNavigation } from '../../components/navigation';
import { KpiHostsComponent } from '../../components/page/hosts';
import { manageQuery } from '../../components/page/manage_query';
import { SiemSearchBar } from '../../components/search_bar';
import { WrapperPage } from '../../components/wrapper_page';
import { KpiHostsQuery } from '../../containers/kpi_hosts';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { LastEventIndexKey } from '../../graphql/types';
import { useKibana } from '../../lib/kibana';
import { convertToBuildEsQuery } from '../../lib/keury';
import { inputsSelectors, State, hostsModel } from '../../store';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { SpyRoute } from '../../utils/route/spy_routes';
import { esQuery } from '../../../../../../../src/plugins/data/public';
import { HostsEmptyPage } from './hosts_empty_page';
import { HostsTabs } from './hosts_tabs';
import { navTabsHosts } from './nav_tabs';
import * as i18n from './translations';
import { HostsComponentProps, HostsComponentReduxProps } from './types';
import { filterAlertsHosts } from './navigation';
import { HostsTableType } from '../../store/hosts/model';

const KpiHostsComponentManage = manageQuery(KpiHostsComponent);

const HostsComponent = React.memo<HostsComponentProps & HostsReduxProps>(
  ({
    deleteQuery,
    isInitializing,
    filters,
    from,
    query,
    setAbsoluteRangeDatePicker,
    setQuery,
    to,
    hostsPagePath,
  }) => {
    const capabilities = React.useContext(MlCapabilitiesContext);
    const kibana = useKibana();
    const { tabName } = useParams();

    const hostsFilters = React.useMemo(() => {
      if (tabName === HostsTableType.alerts) {
        return filters.length > 0 ? [...filters, ...filterAlertsHosts] : filterAlertsHosts;
      }
      return filters;
    }, [tabName]);
    const narrowDateRange = useCallback(
      (min: number, max: number) => {
        setAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
      },
      [setAbsoluteRangeDatePicker]
    );

    return (
      <>
        <WithSource sourceId="default">
          {({ indicesExist, indexPattern }) => {
            const filterQuery = convertToBuildEsQuery({
              config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
              indexPattern,
              queries: [query],
              filters: hostsFilters,
            });
            return indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
              <StickyContainer>
                <FiltersGlobal>
                  <SiemSearchBar indexPattern={indexPattern} id="global" />
                </FiltersGlobal>

                <WrapperPage>
                  <HeaderPage
                    border
                    subtitle={<LastEventTime indexKey={LastEventIndexKey.hosts} />}
                    title={i18n.PAGE_TITLE}
                  />

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
                        narrowDateRange={narrowDateRange}
                      />
                    )}
                  </KpiHostsQuery>

                  <EuiSpacer />

                  <SiemNavigation navTabs={navTabsHosts(hasMlUserPermissions(capabilities))} />

                  <EuiSpacer />

                  <HostsTabs
                    deleteQuery={deleteQuery}
                    to={to}
                    filterQuery={filterQuery}
                    isInitializing={isInitializing}
                    setQuery={setQuery}
                    from={from}
                    type={hostsModel.HostsType.page}
                    indexPattern={indexPattern}
                    setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker}
                    hostsPagePath={hostsPagePath}
                  />
                </WrapperPage>
              </StickyContainer>
            ) : (
              <WrapperPage>
                <HeaderPage border title={i18n.PAGE_TITLE} />

                <HostsEmptyPage />
              </WrapperPage>
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

const connector = connect(makeMapStateToProps, {
  setAbsoluteRangeDatePicker: dispatchSetAbsoluteRangeDatePicker,
});

type HostsReduxProps = ConnectedProps<typeof connector>;

export const Hosts = connector(HostsComponent);

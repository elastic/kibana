/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import * as React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { StickyContainer } from 'react-sticky';

import { ActionCreator } from 'typescript-fsa';
import { HeaderPage } from '../../components/header_page';
import { LastEventTime } from '../../components/last_event_time';
import { KpiHostsComponent } from '../../components/page/hosts';
import { manageQuery } from '../../components/page/manage_query';
import { GlobalTimeArgs } from '../../containers/global_time';
import { KpiHostsQuery } from '../../containers/kpi_hosts';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { LastEventIndexKey } from '../../graphql/types';
import { hostsModel, hostsSelectors, State } from '../../store';

import { HostsEmptyPage } from './hosts_empty_page';
import { HostsKql } from './kql';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { InputsModelId } from '../../store/inputs/constants';
import { SiemNavigation } from '../../components/navigation';
import { SpyRoute } from '../../utils/route/spy_routes';
import { FiltersGlobal } from '../../components/filters_global';

import * as i18n from './translations';
import {
  navTabsHosts,
  AnomaliesQueryTabBodyProps,
  HostsComponentsQueryProps,
} from './hosts_navigations';
import { hasMlUserPermissions } from '../../components/ml/permissions/has_ml_user_permissions';
import { MlCapabilitiesContext } from '../../components/ml/permissions/ml_capabilities_provider';

const KpiHostsComponentManage = manageQuery(KpiHostsComponent);

interface HostsComponentReduxProps {
  filterQuery: string;
}

interface HostsComponentDispatchProps {
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>;
}

export type CommonChildren = (args: HostsComponentsQueryProps) => JSX.Element;
export type AnonamaliesChildren = (args: AnomaliesQueryTabBodyProps) => JSX.Element;

export type HostsQueryProps = GlobalTimeArgs;

export type HostsComponentProps = HostsComponentReduxProps &
  HostsComponentDispatchProps &
  HostsQueryProps;

const HostsComponent = React.memo<HostsComponentProps>(
  ({ isInitializing, filterQuery, from, setAbsoluteRangeDatePicker, setQuery, to }) => {
    const capabilities = React.useContext(MlCapabilitiesContext);
    return (
      <>
        <WithSource sourceId="default">
          {({ indicesExist, indexPattern }) =>
            indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
              <StickyContainer>
                <FiltersGlobal>
                  <HostsKql
                    indexPattern={indexPattern}
                    setQuery={setQuery}
                    type={hostsModel.HostsType.page}
                  />
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
                          /**
                           * Using setTimeout here because of this issue:
                           * https://github.com/elastic/elastic-charts/issues/360
                           * Need to remove the setTimeout here after this issue is fixed.
                           * */
                          setTimeout(() => {
                            setAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
                          }, 500);
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
            )
          }
        </WithSource>
        <SpyRoute />
      </>
    );
  }
);

HostsComponent.displayName = 'HostsComponent';

const makeMapStateToProps = () => {
  const getHostsFilterQueryAsJson = hostsSelectors.hostsFilterQueryAsJson();
  const mapStateToProps = (state: State): HostsComponentReduxProps => ({
    filterQuery: getHostsFilterQueryAsJson(state, hostsModel.HostsType.page) || '',
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

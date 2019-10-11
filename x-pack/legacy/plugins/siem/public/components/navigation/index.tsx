/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import React, { useEffect } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { RouteSpyState } from '../../utils/route/types';
import { useRouteSpy } from '../../utils/route/use_route_spy';
import { CONSTANTS } from '../url_state/constants';
import {
  inputsSelectors,
  hostsSelectors,
  networkSelectors,
  timelineSelectors,
  State,
  hostsModel,
  networkModel,
} from '../../store';

import { setBreadcrumbs } from './breadcrumbs';
import { TabNavigation } from './tab_navigation';
import { TabNavigationProps } from './tab_navigation/types';
import { SiemNavigationComponentProps } from './types';

export const SiemNavigationComponent = React.memo<TabNavigationProps & RouteSpyState>(
  ({
    detailName,
    display,
    hostDetails,
    hosts,
    navTabs,
    network,
    pageName,
    pathName,
    search,
    showBorder,
    tabName,
    timelineId,
    timerange,
  }) => {
    useEffect(() => {
      if (pathName) {
        setBreadcrumbs({
          detailName,
          hosts,
          hostDetails,
          navTabs,
          network,
          pageName,
          pathName,
          search,
          tabName,
          timerange,
          timelineId,
        });
      }
    }, [pathName, search, hosts, hostDetails, network, navTabs, timerange, timelineId]);

    return (
      <TabNavigation
        display={display}
        hosts={hosts}
        hostDetails={hostDetails}
        navTabs={navTabs}
        network={network}
        pageName={pageName}
        pathName={pathName}
        showBorder={showBorder}
        tabName={tabName}
        timelineId={timelineId}
        timerange={timerange}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.pathName === nextProps.pathName &&
      prevProps.search === nextProps.search &&
      isEqual(prevProps.hosts, nextProps.hosts) &&
      isEqual(prevProps.hostDetails, nextProps.hostDetails) &&
      isEqual(prevProps.network, nextProps.network) &&
      isEqual(prevProps.navTabs, nextProps.navTabs) &&
      isEqual(prevProps.timerange, nextProps.timerange) &&
      isEqual(prevProps.timelineId, nextProps.timelineId)
    );
  }
);

SiemNavigationComponent.displayName = 'SiemNavigationComponent';

const makeMapStateToProps = () => {
  const getInputsSelector = inputsSelectors.inputsSelector();
  const getHostsFilterQueryAsKuery = hostsSelectors.hostsFilterQueryAsKuery();
  const getNetworkFilterQueryAsKuery = networkSelectors.networkFilterQueryAsKuery();
  const getTimelines = timelineSelectors.getTimelines();
  const mapStateToProps = (state: State) => {
    const inputState = getInputsSelector(state);
    const { linkTo: globalLinkTo, timerange: globalTimerange } = inputState.global;
    const { linkTo: timelineLinkTo, timerange: timelineTimerange } = inputState.timeline;

    const openTimelineId = Object.entries(getTimelines(state)).reduce(
      (useTimelineId, [timelineId, timelineObj]) =>
        timelineObj.savedObjectId != null ? timelineObj.savedObjectId : useTimelineId,
      ''
    );

    return {
      hosts: {
        filterQuery: getHostsFilterQueryAsKuery(state, hostsModel.HostsType.page),
        queryLocation: CONSTANTS.hostsPage,
      },
      hostDetails: {
        filterQuery: getHostsFilterQueryAsKuery(state, hostsModel.HostsType.details),
        queryLocation: CONSTANTS.hostsDetails,
      },
      network: {
        filterQuery: getNetworkFilterQueryAsKuery(state, networkModel.NetworkType.page),
        queryLocation: CONSTANTS.networkPage,
      },
      [CONSTANTS.timerange]: {
        global: {
          [CONSTANTS.timerange]: globalTimerange,
          linkTo: globalLinkTo,
        },
        timeline: {
          [CONSTANTS.timerange]: timelineTimerange,
          linkTo: timelineLinkTo,
        },
      },
      [CONSTANTS.timelineId]: openTimelineId,
    };
  };

  return mapStateToProps;
};

export const SiemNavigationRedux = compose<
  React.ComponentClass<SiemNavigationComponentProps & RouteSpyState>
>(connect(makeMapStateToProps))(SiemNavigationComponent);

export const SiemNavigation = React.memo<SiemNavigationComponentProps>(props => {
  const [routeProps] = useRouteSpy();
  const stateNavReduxProps: RouteSpyState & SiemNavigationComponentProps = {
    ...routeProps,
    ...props,
  };
  return <SiemNavigationRedux {...stateNavReduxProps} />;
});

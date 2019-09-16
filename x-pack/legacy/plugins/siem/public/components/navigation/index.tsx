/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import React from 'react';
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

export class SiemNavigationComponent extends React.Component<TabNavigationProps & RouteSpyState> {
  public shouldComponentUpdate(nextProps: Readonly<TabNavigationProps & RouteSpyState>): boolean {
    if (
      this.props.pathName === nextProps.pathName &&
      this.props.search === nextProps.search &&
      isEqual(this.props.hosts, nextProps.hosts) &&
      isEqual(this.props.hostDetails, nextProps.hostDetails) &&
      isEqual(this.props.network, nextProps.network) &&
      isEqual(this.props.navTabs, nextProps.navTabs) &&
      isEqual(this.props.timerange, nextProps.timerange) &&
      isEqual(this.props.timelineId, nextProps.timelineId)
    ) {
      return false;
    }
    return true;
  }

  public componentWillMount(): void {
    const {
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
    } = this.props;
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
  }

  public componentWillReceiveProps(nextProps: Readonly<RouteSpyState & TabNavigationProps>): void {
    if (
      this.props.pathName !== nextProps.pathName ||
      this.props.search !== nextProps.search ||
      !isEqual(this.props.hosts, nextProps.hosts) ||
      !isEqual(this.props.hostDetails, nextProps.hostDetails) ||
      !isEqual(this.props.network, nextProps.network) ||
      !isEqual(this.props.navTabs, nextProps.navTabs) ||
      !isEqual(this.props.timerange, nextProps.timerange) ||
      !isEqual(this.props.timelineId, nextProps.timelineId)
    ) {
      const {
        detailName,
        hosts,
        hostDetails,
        navTabs,
        network,
        pageName,
        pathName,
        search,
        tabName,
        timelineId,
        timerange,
      } = nextProps;
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
    }
  }

  public render() {
    const {
      display,
      hostDetails,
      hosts,
      navTabs,
      network,
      pageName,
      pathName,
      showBorder,
      tabName,
      timelineId,
      timerange,
    } = this.props;
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
  }
}

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
      (useTimelineId, [timelineId, timelineObj]) => {
        if (timelineObj.savedObjectId != null) {
          return timelineObj.savedObjectId;
        }
        return useTimelineId;
      },
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

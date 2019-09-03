/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { setBreadcrumbs } from './breadcrumbs';
import { TabNavigation } from './tab_navigation';
import { TabNavigationProps, SiemNavigationComponentProps } from './type';
import {
  inputsSelectors,
  hostsSelectors,
  networkSelectors,
  timelineSelectors,
  State,
  hostsModel,
  networkModel,
} from '../../store';
import { CONSTANTS } from '../url_state/constants';

export class SiemNavigationComponent extends React.Component<
  RouteComponentProps & TabNavigationProps
> {
  public shouldComponentUpdate(nextProps: Readonly<RouteComponentProps>): boolean {
    if (
      this.props.location.pathname === nextProps.location.pathname &&
      this.props.location.search === nextProps.location.search
    ) {
      return false;
    }
    return true;
  }

  public componentWillMount(): void {
    const {
      location,
      match: { params },
    } = this.props;
    if (location.pathname) {
      setBreadcrumbs(location.pathname, params);
    }
  }

  public componentWillReceiveProps(nextProps: Readonly<RouteComponentProps>): void {
    if (this.props.location.pathname !== nextProps.location.pathname) {
      setBreadcrumbs(nextProps.location.pathname, nextProps.match.params);
    }
  }

  public render() {
    const {
      display,
      location,
      hosts,
      hostDetails,
      match,
      navTabs,
      network,
      showBorder,
      timerange,
      timelineId,
    } = this.props;
    return (
      <TabNavigation
        display={display}
        location={location}
        hosts={hosts}
        hostDetails={hostDetails}
        match={match}
        navTabs={navTabs}
        network={network}
        showBorder={showBorder}
        timerange={timerange}
        timelineId={timelineId}
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
          useTimelineId = timelineObj.savedObjectId;
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

export const SiemNavigation = compose<React.ComponentClass<SiemNavigationComponentProps>>(
  withRouter,
  connect(makeMapStateToProps)
)(SiemNavigationComponent);

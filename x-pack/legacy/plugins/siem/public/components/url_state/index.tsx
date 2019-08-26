/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import { isEqual } from 'lodash/fp';
import {
  hostsModel,
  hostsSelectors,
  inputsSelectors,
  networkModel,
  networkSelectors,
  State,
} from '../../store';
import { hostsActions, inputsActions, networkActions } from '../../store/actions';

import { CONSTANTS } from './constants';
import { UrlStateContainerPropTypes, UrlStateProps, KqlQueryObject } from './types';
import { useUrlStateHooks } from './use_url_state';
import { HostsTableType } from '../../store/hosts/model';
import { NetworkTableType, IpDetailsTableType } from '../../store/network/model';

export const UrlStateContainer = React.memo<UrlStateContainerPropTypes>(
  props => {
    const { isInitializing } = useUrlStateHooks(props);
    return <>{props.children({ isInitializing })}</>;
  },
  (prevProps, nextProps) =>
    prevProps.location.pathname === nextProps.location.pathname &&
    isEqual(prevProps.urlState, nextProps.urlState) &&
    prevProps.location.search === nextProps.location.search
);

UrlStateContainer.displayName = 'UrlStateContainer';

const makeMapStateToProps = () => {
  const getInputsSelector = inputsSelectors.inputsSelector();
  const getHostsFilterQueryAsKuery = hostsSelectors.hostsFilterQueryAsKuery();
  const getNetworkFilterQueryAsKuery = networkSelectors.networkFilterQueryAsKuery();
  const mapStateToProps = (state: State) => {
    const inputState = getInputsSelector(state);
    const { linkTo: globalLinkTo, timerange: globalTimerange } = inputState.global;
    const { linkTo: timelineLinkTo, timerange: timelineTimerange } = inputState.timeline;

    const kqlQueryInitialState: KqlQueryObject = {
      [CONSTANTS.hostsDetails]: {
        filterQuery: getHostsFilterQueryAsKuery(state, hostsModel.HostsType.details),
        queryLocation: CONSTANTS.hostsDetails,
        type: hostsModel.HostsType.details,
        selectedTab: HostsTableType.authentications,
      },
      [CONSTANTS.hostsPage]: {
        filterQuery: getHostsFilterQueryAsKuery(state, hostsModel.HostsType.page),
        queryLocation: CONSTANTS.hostsPage,
        type: hostsModel.HostsType.page,
        selectedTab: HostsTableType.hosts,
      },
      [CONSTANTS.networkDetails]: {
        filterQuery: getNetworkFilterQueryAsKuery(state, networkModel.NetworkType.details),
        queryLocation: CONSTANTS.networkDetails,
        type: networkModel.NetworkType.details,
        selectedTab: NetworkTableType.topNFlow,
      },
      [CONSTANTS.networkPage]: {
        filterQuery: getNetworkFilterQueryAsKuery(state, networkModel.NetworkType.page),
        queryLocation: CONSTANTS.networkPage,
        type: networkModel.NetworkType.page,
        selectedTab: IpDetailsTableType.domains,
      },
    };

    return {
      urlState: {
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
        [CONSTANTS.kqlQuery]: kqlQueryInitialState,
      },
    };
  };

  return mapStateToProps;
};

export const UseUrlState = compose<React.ComponentClass<UrlStateProps>>(
  withRouter,
  connect(
    makeMapStateToProps,
    {
      setAbsoluteTimerange: inputsActions.setAbsoluteRangeDatePicker,
      setHostsKql: hostsActions.applyHostsFilterQuery,
      setNetworkKql: networkActions.applyNetworkFilterQuery,
      setRelativeTimerange: inputsActions.setRelativeRangeDatePicker,
      toggleTimelineLinkTo: inputsActions.toggleTimelineLinkTo,
    }
  )
)(UrlStateContainer);

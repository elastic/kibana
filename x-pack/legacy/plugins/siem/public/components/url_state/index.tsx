/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { compose, Dispatch } from 'redux';
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
  timelineSelectors,
} from '../../store';
import { hostsActions, inputsActions, networkActions, timelineActions } from '../../store/actions';

import { CONSTANTS } from './constants';
import { UrlStateContainerPropTypes, UrlStateProps, KqlQuery, LocationTypes } from './types';
import { useUrlStateHooks } from './use_url_state';
import { dispatchUpdateTimeline } from '../open_timeline/helpers';
import { getCurrentLocation } from './helpers';

export const UrlStateContainer = React.memo<UrlStateContainerPropTypes>(
  props => {
    useUrlStateHooks(props);
    return null;
  },
  (prevProps, nextProps) =>
    prevProps.location.pathname === nextProps.location.pathname &&
    isEqual(prevProps.urlState, nextProps.urlState)
);

UrlStateContainer.displayName = 'UrlStateContainer';

const makeMapStateToProps = () => {
  const getInputsSelector = inputsSelectors.inputsSelector();
  const getHostsFilterQueryAsKuery = hostsSelectors.hostsFilterQueryAsKuery();
  const getNetworkFilterQueryAsKuery = networkSelectors.networkFilterQueryAsKuery();
  const getTimelines = timelineSelectors.getTimelines();
  const mapStateToProps = (state: State, { location }: UrlStateContainerPropTypes) => {
    const inputState = getInputsSelector(state);
    const { linkTo: globalLinkTo, timerange: globalTimerange } = inputState.global;
    const { linkTo: timelineLinkTo, timerange: timelineTimerange } = inputState.timeline;

    const page: LocationTypes | null = getCurrentLocation(location.pathname);
    const kqlQueryInitialState: KqlQuery = {
      filterQuery: null,
      queryLocation: page,
    };
    if (page === CONSTANTS.hostsPage) {
      kqlQueryInitialState.filterQuery = getHostsFilterQueryAsKuery(
        state,
        hostsModel.HostsType.page
      );
    } else if (page === CONSTANTS.hostsDetails) {
      kqlQueryInitialState.filterQuery = getHostsFilterQueryAsKuery(
        state,
        hostsModel.HostsType.details
      );
    } else if (page === CONSTANTS.networkPage) {
      kqlQueryInitialState.filterQuery = getNetworkFilterQueryAsKuery(
        state,
        networkModel.NetworkType.page
      );
    } else if (page === CONSTANTS.networkDetails) {
      kqlQueryInitialState.filterQuery = getNetworkFilterQueryAsKuery(
        state,
        networkModel.NetworkType.details
      );
    }

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
        [CONSTANTS.timelineId]: openTimelineId,
      },
    };
  };

  return mapStateToProps;
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  addGlobalLinkTo: inputsActions.addGlobalLinkTo,
  addTimelineLinkTo: inputsActions.addTimelineLinkTo,
  removeGlobalLinkTo: inputsActions.removeGlobalLinkTo,
  removeTimelineLinkTo: inputsActions.removeTimelineLinkTo,
  setAbsoluteTimerange: inputsActions.setAbsoluteRangeDatePicker,
  setHostsKql: hostsActions.applyHostsFilterQuery,
  setNetworkKql: networkActions.applyNetworkFilterQuery,
  setRelativeTimerange: inputsActions.setRelativeRangeDatePicker,
  updateTimeline: dispatchUpdateTimeline(dispatch),
  updateTimelineIsLoading: timelineActions.updateIsLoading,
  dispatch,
});

export const UseUrlState = compose<React.ComponentClass<UrlStateProps>>(
  withRouter,
  connect(
    makeMapStateToProps,
    mapDispatchToProps
  )
)(UrlStateContainer);

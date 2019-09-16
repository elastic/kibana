/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { compose, Dispatch } from 'redux';
import { connect } from 'react-redux';

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
import { timelineActions } from '../../store/actions';
import { RouteSpyState } from '../../utils/route/types';
import { useRouteSpy } from '../../utils/route/use_route_spy';

import { CONSTANTS } from './constants';
import { UrlStateContainerPropTypes, UrlStateProps, KqlQuery, LocationTypes } from './types';
import { useUrlStateHooks } from './use_url_state';
import { dispatchUpdateTimeline } from '../open_timeline/helpers';
import { getCurrentLocation } from './helpers';
import { dispatchSetInitialStateFromUrl } from './initialize_redux_by_url';

export const UrlStateContainer = React.memo<UrlStateContainerPropTypes>(
  (props: UrlStateContainerPropTypes) => {
    useUrlStateHooks(props);
    return null;
  },
  (prevProps, nextProps) =>
    prevProps.pathName === nextProps.pathName && isEqual(prevProps.urlState, nextProps.urlState)
);

UrlStateContainer.displayName = 'UrlStateContainer';

const makeMapStateToProps = () => {
  const getInputsSelector = inputsSelectors.inputsSelector();
  const getHostsFilterQueryAsKuery = hostsSelectors.hostsFilterQueryAsKuery();
  const getNetworkFilterQueryAsKuery = networkSelectors.networkFilterQueryAsKuery();
  const getTimelines = timelineSelectors.getTimelines();
  const mapStateToProps = (state: State, { pageName, detailName }: UrlStateContainerPropTypes) => {
    const inputState = getInputsSelector(state);
    const { linkTo: globalLinkTo, timerange: globalTimerange } = inputState.global;
    const { linkTo: timelineLinkTo, timerange: timelineTimerange } = inputState.timeline;

    const page: LocationTypes | null = getCurrentLocation(pageName, detailName);
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
          return timelineObj.savedObjectId;
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
  setInitialStateFromUrl: dispatchSetInitialStateFromUrl(dispatch),
  updateTimeline: dispatchUpdateTimeline(dispatch),
  updateTimelineIsLoading: ({ id, isLoading }: { id: string; isLoading: boolean }) =>
    dispatch(timelineActions.updateIsLoading({ id, isLoading })),
});

export const UrlStateRedux = compose<React.ComponentClass<UrlStateProps & RouteSpyState>>(
  connect(
    makeMapStateToProps,
    mapDispatchToProps
  )
)(UrlStateContainer);

export const UseUrlState = React.memo<UrlStateProps>(props => {
  const [routeProps] = useRouteSpy();
  const urlStateReduxProps: RouteSpyState & UrlStateProps = { ...routeProps, ...props };
  return <UrlStateRedux {...urlStateReduxProps} />;
});

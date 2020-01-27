/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import React from 'react';
import { compose, Dispatch } from 'redux';
import { connect } from 'react-redux';

import { timelineActions } from '../../store/actions';
import { RouteSpyState } from '../../utils/route/types';
import { useRouteSpy } from '../../utils/route/use_route_spy';

import { UrlStateContainerPropTypes, UrlStateProps } from './types';
import { useUrlStateHooks } from './use_url_state';
import { dispatchUpdateTimeline } from '../open_timeline/helpers';
import { dispatchSetInitialStateFromUrl } from './initialize_redux_by_url';
import { makeMapStateToProps } from './helpers';

export const UrlStateContainer = React.memo<UrlStateContainerPropTypes>(
  (props: UrlStateContainerPropTypes) => {
    useUrlStateHooks(props);
    return null;
  },
  (prevProps, nextProps) =>
    prevProps.pathName === nextProps.pathName && isEqual(prevProps.urlState, nextProps.urlState)
);

UrlStateContainer.displayName = 'UrlStateContainer';

const mapDispatchToProps = (dispatch: Dispatch) => ({
  setInitialStateFromUrl: dispatchSetInitialStateFromUrl(dispatch),
  updateTimeline: dispatchUpdateTimeline(dispatch),
  updateTimelineIsLoading: ({ id, isLoading }: { id: string; isLoading: boolean }) =>
    dispatch(timelineActions.updateIsLoading({ id, isLoading })),
});

export const UrlStateRedux = compose<React.ComponentClass<UrlStateProps & RouteSpyState>>(
  connect(makeMapStateToProps, mapDispatchToProps)
)(UrlStateContainer);

export const UseUrlState = React.memo<UrlStateProps>(props => {
  const [routeProps] = useRouteSpy();
  const urlStateReduxProps: RouteSpyState & UrlStateProps = {
    ...routeProps,
    ...props,
  };
  return <UrlStateRedux {...urlStateReduxProps} />;
});

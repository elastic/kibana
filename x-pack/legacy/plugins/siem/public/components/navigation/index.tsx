/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';

import { RouteSpyState } from '../../utils/route/types';
import { useRouteSpy } from '../../utils/route/use_route_spy';
import { makeMapStateToProps } from '../url_state/helpers';
import { setBreadcrumbs } from './breadcrumbs';
import { TabNavigation } from './tab_navigation';
import { SiemNavigationProps, SiemNavigationComponentProps } from './types';

export const SiemNavigationComponent = React.memo<
  SiemNavigationComponentProps & SiemNavigationProps & RouteSpyState
>(
  ({ detailName, display, navTabs, pageName, pathName, search, tabName, urlState }) => {
    useEffect(() => {
      if (pathName) {
        setBreadcrumbs({
          query: urlState.query,
          detailName,
          filters: urlState.filters,
          navTabs,
          pageName,
          pathName,
          savedQuery: urlState.savedQuery,
          search,
          tabName,
          timerange: urlState.timerange,
          timeline: urlState.timeline,
        });
      }
    }, [pathName, search, navTabs, urlState]);

    return (
      <TabNavigation
        display={display}
        filters={urlState.filters}
        navTabs={navTabs}
        pageName={pageName}
        pathName={pathName}
        query={urlState.query}
        savedQuery={urlState.savedQuery}
        tabName={tabName}
        timeline={urlState.timeline}
        timerange={urlState.timerange}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.pathName === nextProps.pathName &&
      prevProps.search === nextProps.search &&
      isEqual(prevProps.navTabs, nextProps.navTabs) &&
      isEqual(prevProps.urlState, nextProps.urlState)
    );
  }
);

SiemNavigationComponent.displayName = 'SiemNavigationComponent';

export const SiemNavigationRedux = compose<
  React.ComponentClass<SiemNavigationProps & RouteSpyState>
>(connect(makeMapStateToProps))(SiemNavigationComponent);

export const SiemNavigation = React.memo<SiemNavigationProps>(props => {
  const [routeProps] = useRouteSpy();
  const stateNavReduxProps: RouteSpyState & SiemNavigationProps = {
    ...routeProps,
    ...props,
  };
  return <SiemNavigationRedux {...stateNavReduxProps} />;
});

SiemNavigation.displayName = 'SiemNavigation';

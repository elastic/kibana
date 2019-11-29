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
import { TabNavigationProps } from './tab_navigation/types';
import { SiemNavigationComponentProps } from './types';

export const SiemNavigationComponent = React.memo<TabNavigationProps & RouteSpyState>(
  ({
    query,
    detailName,
    display,
    filters,
    navTabs,
    pageName,
    pathName,
    savedQuery,
    search,
    tabName,
    timeline,
    timerange,
  }) => {
    useEffect(() => {
      if (pathName) {
        setBreadcrumbs({
          query,
          detailName,
          filters,
          navTabs,
          pageName,
          pathName,
          savedQuery,
          search,
          tabName,
          timerange,
          timeline,
        });
      }
    }, [query, pathName, search, filters, navTabs, savedQuery, timerange, timeline]);

    return (
      <TabNavigation
        query={query}
        display={display}
        filters={filters}
        navTabs={navTabs}
        pageName={pageName}
        pathName={pathName}
        savedQuery={savedQuery}
        tabName={tabName}
        timeline={timeline}
        timerange={timerange}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.pathName === nextProps.pathName &&
      prevProps.search === nextProps.search &&
      prevProps.savedQuery === nextProps.savedQuery &&
      isEqual(prevProps.query, nextProps.query) &&
      isEqual(prevProps.filters, nextProps.filters) &&
      isEqual(prevProps.navTabs, nextProps.navTabs) &&
      isEqual(prevProps.timerange, nextProps.timerange) &&
      isEqual(prevProps.timeline, nextProps.timeline)
    );
  }
);

SiemNavigationComponent.displayName = 'SiemNavigationComponent';

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

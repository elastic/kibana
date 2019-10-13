/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '@kbn/es-query';
import { isEqual } from 'lodash/fp';
import React, { useEffect } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { Query } from 'src/plugins/data/common';

import { RouteSpyState } from '../../utils/route/types';
import { useRouteSpy } from '../../utils/route/use_route_spy';
import { CONSTANTS } from '../url_state/constants';
import { inputsSelectors, timelineSelectors, State } from '../../store';

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
    showBorder,
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
        showBorder={showBorder}
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

const makeMapStateToProps = () => {
  const getInputsSelector = inputsSelectors.inputsSelector();
  const getGlobalQuerySelector = inputsSelectors.globalQuerySelector();
  const getGlobalFiltersQuerySelector = inputsSelectors.globalFiltersQuerySelector();
  const getGlobalSavedQuerySelector = inputsSelectors.globalSavedQuerySelector();
  const getTimelines = timelineSelectors.getTimelines();
  const mapStateToProps = (state: State) => {
    const inputState = getInputsSelector(state);
    const { linkTo: globalLinkTo, timerange: globalTimerange } = inputState.global;
    const { linkTo: timelineLinkTo, timerange: timelineTimerange } = inputState.timeline;

    const timeline = Object.entries(getTimelines(state)).reduce(
      (obj, [timelineId, timelineObj]) => ({
        id: timelineObj.savedObjectId != null ? timelineObj.savedObjectId : '',
        isOpen: timelineObj.show,
      }),
      { id: '', isOpen: false }
    );

    let searchAttr: {
      [CONSTANTS.appQuery]?: Query;
      [CONSTANTS.filters]?: Filter[];
      [CONSTANTS.savedQuery]?: string;
    } = {
      [CONSTANTS.appQuery]: getGlobalQuerySelector(state),
      [CONSTANTS.filters]: getGlobalFiltersQuerySelector(state),
    };
    const savedQuery = getGlobalSavedQuerySelector(state);
    if (savedQuery != null && savedQuery.id !== '') {
      searchAttr = {
        [CONSTANTS.savedQuery]: savedQuery.id,
      };
    }

    return {
      ...searchAttr,
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
      [CONSTANTS.timeline]: timeline,
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

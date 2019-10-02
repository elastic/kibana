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
import { inputsSelectors, timelineSelectors, State } from '../../store';

import { setBreadcrumbs } from './breadcrumbs';
import { TabNavigation } from './tab_navigation';
import { TabNavigationProps } from './tab_navigation/types';
import { SiemNavigationComponentProps } from './types';
import { UrlSateQuery } from '../url_state/types';

export const SiemNavigationComponent = React.memo<TabNavigationProps & RouteSpyState>(
  ({
    detailName,
    display,
    kqlQuery,
    navTabs,
    pageName,
    pathName,
    search,
    showBorder,
    tabName,
    timeline,
    timerange,
  }) => {
    useEffect(() => {
      if (pathName) {
        setBreadcrumbs({
          detailName,
          kqlQuery,
          navTabs,
          pageName,
          pathName,
          search,
          tabName,
          timerange,
          timeline,
        });
      }
    }, [pathName, search, kqlQuery, navTabs, timerange, timeline]);

    return (
      <TabNavigation
        display={display}
        kqlQuery={kqlQuery}
        navTabs={navTabs}
        pageName={pageName}
        pathName={pathName}
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
      isEqual(prevProps.kqlQuery, nextProps.kqlQuery) &&
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

    let kqlQuery: UrlSateQuery = {
      appQuery: getGlobalQuerySelector(state),
      filters: getGlobalFiltersQuerySelector(state),
    };
    const savedQuery = getGlobalSavedQuerySelector(state);
    if (savedQuery != null && savedQuery.id !== '') {
      kqlQuery = {
        savedQueryId: savedQuery.id,
      };
    }

    return {
      [CONSTANTS.kqlQuery]: kqlQuery,
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

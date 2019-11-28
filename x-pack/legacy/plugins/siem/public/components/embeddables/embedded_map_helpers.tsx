/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import React from 'react';
import { OutPortal, PortalNode } from 'react-reverse-portal';
import { PluginsStart } from 'ui/new_platform/new_platform';

import { ActionToaster, AppToast } from '../toasters';
import {
  CONTEXT_MENU_TRIGGER,
  PANEL_BADGE_TRIGGER,
  ViewMode,
} from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import {
  IndexPatternMapping,
  MapEmbeddable,
  RenderTooltipContentParams,
  SetQuery,
  EmbeddableApi,
} from './types';
import { getLayerList } from './map_config';
// @ts-ignore Missing type defs as maps moves to Typescript
import { MAP_SAVED_OBJECT_TYPE } from '../../../../maps/common/constants';
import * as i18n from './translations';
import { Query, esFilters } from '../../../../../../../src/plugins/data/public';

/**
 * Displays an error toast for the provided title and message
 *
 * @param errorTitle Title of error to display in toaster and modal
 * @param errorMessage Message to display in error modal when clicked
 * @param dispatchToaster provided by useStateToaster()
 */
export const displayErrorToast = (
  errorTitle: string,
  errorMessage: string,
  dispatchToaster: React.Dispatch<ActionToaster>
) => {
  const toast: AppToast = {
    id: uuid.v4(),
    title: errorTitle,
    color: 'danger',
    iconType: 'alert',
    errors: [errorMessage],
  };
  dispatchToaster({
    type: 'addToaster',
    toast,
  });
};

/**
 * Temporary Embeddables API configuration override until ability to edit actions is addressed:
 * https://github.com/elastic/kibana/issues/43643
 *
 * @param plugins new platform plugins
 *
 * @throws Error if trigger/action doesn't exist
 */
export const setupEmbeddablesAPI = (plugins: PluginsStart) => {
  try {
    plugins.uiActions.detachAction(CONTEXT_MENU_TRIGGER, 'CUSTOM_TIME_RANGE');
    plugins.uiActions.detachAction(PANEL_BADGE_TRIGGER, 'CUSTOM_TIME_RANGE_BADGE');
  } catch (e) {
    throw e;
  }
};

/**
 * Creates MapEmbeddable with provided initial configuration
 *
 * @param filters any existing global filters
 * @param indexPatterns list of index patterns to configure layers for
 * @param query initial query constraints as Query
 * @param startDate
 * @param endDate
 * @param setQuery function as provided by the GlobalTime component for reacting to refresh
 * @param portalNode wrapper for MapToolTip so it is not rendered in the embeddables component tree
 * @param embeddableApi
 *
 * @throws Error if EmbeddableFactory does not exist
 */
export const createEmbeddable = async (
  filters: esFilters.Filter[],
  indexPatterns: IndexPatternMapping[],
  query: Query,
  startDate: number,
  endDate: number,
  setQuery: SetQuery,
  portalNode: PortalNode,
  embeddableApi: EmbeddableApi
): Promise<MapEmbeddable> => {
  const factory = embeddableApi.getEmbeddableFactory(MAP_SAVED_OBJECT_TYPE);

  const state = {
    layerList: getLayerList(indexPatterns),
    title: i18n.MAP_TITLE,
  };
  const input = {
    id: uuid.v4(),
    filters,
    hidePanelTitles: true,
    query,
    refreshConfig: { value: 0, pause: true },
    timeRange: {
      from: new Date(startDate).toISOString(),
      to: new Date(endDate).toISOString(),
    },
    viewMode: ViewMode.VIEW,
    isLayerTOCOpen: false,
    openTOCDetails: [],
    hideFilterActions: false,
    mapCenter: { lon: -1.05469, lat: 15.96133, zoom: 1 },
  };

  const renderTooltipContent = ({
    addFilters,
    closeTooltip,
    features,
    isLocked,
    getLayerName,
    loadFeatureProperties,
    loadFeatureGeometry,
  }: RenderTooltipContentParams) => {
    const props = {
      addFilters,
      closeTooltip,
      features,
      isLocked,
      getLayerName,
      loadFeatureProperties,
      loadFeatureGeometry,
    };
    return <OutPortal node={portalNode} {...props} />;
  };

  // @ts-ignore method added in https://github.com/elastic/kibana/pull/43878
  const embeddableObject = await factory.createFromState(
    state,
    input,
    undefined,
    renderTooltipContent
  );

  // Wire up to app refresh action
  setQuery({
    id: 'embeddedMap', // Scope to page type if using map elsewhere
    inspect: null,
    loading: false,
    refetch: () => embeddableObject.reload(),
  });

  return embeddableObject;
};

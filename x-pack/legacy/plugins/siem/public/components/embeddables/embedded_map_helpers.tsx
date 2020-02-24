/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import React from 'react';
import { OutPortal, PortalNode } from 'react-reverse-portal';
import minimatch from 'minimatch';
import { ViewMode } from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
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
import { Query, Filter } from '../../../../../../../src/plugins/data/public';
import { IndexPatternSavedObject } from '../../hooks/types';

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
  filters: Filter[],
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
    disabledActions: ['CUSTOM_TIME_RANGE', 'CUSTOM_TIME_RANGE_BADGE'],
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

/**
 * Returns kibanaIndexPatterns that wildcard match at least one of siemDefaultIndices
 *
 * @param kibanaIndexPatterns
 * @param siemDefaultIndices
 */
export const findMatchingIndexPatterns = ({
  kibanaIndexPatterns,
  siemDefaultIndices,
}: {
  kibanaIndexPatterns: IndexPatternSavedObject[];
  siemDefaultIndices: string[];
}): IndexPatternSavedObject[] => {
  try {
    return kibanaIndexPatterns.filter(kip =>
      siemDefaultIndices.some(sdi => minimatch(sdi, kip.attributes.title))
    );
  } catch {
    return [];
  }
};

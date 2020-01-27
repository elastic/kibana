/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { createSavedObjectClass } from 'ui/saved_objects/saved_object';
import {
  getTimeFilters,
  getMapZoom,
  getMapCenter,
  getLayerListRaw,
  getMapExtent,
  getRefreshConfig,
  getQuery,
  getFilters,
} from '../../selectors/map_selectors';
import { getIsLayerTOCOpen, getOpenTOCDetails } from '../../selectors/ui_selectors';
import { convertMapExtentToPolygon } from '../../elasticsearch_geo_utils';
import { copyPersistentState } from '../../reducers/util';
import { extractReferences, injectReferences } from '../../../common/migrations/references';
import { MAP_SAVED_OBJECT_TYPE } from '../../../common/constants';

export function createSavedGisMapClass(services) {
  const SavedObjectClass = createSavedObjectClass(services);

  class SavedGisMap extends SavedObjectClass {
    static type = MAP_SAVED_OBJECT_TYPE;

    // Mappings are used to place object properties into saved object _source
    static mapping = {
      title: 'text',
      description: 'text',
      mapStateJSON: 'text',
      layerListJSON: 'text',
      uiStateJSON: 'text',
      bounds: {
        type: 'object',
      },
    };
    static fieldOrder = ['title', 'description'];
    static searchSource = false;

    constructor(id) {
      super({
        type: SavedGisMap.type,
        mapping: SavedGisMap.mapping,
        searchSource: SavedGisMap.searchSource,
        extractReferences,
        injectReferences: (savedObject, references) => {
          const { attributes } = injectReferences({
            attributes: { layerListJSON: savedObject.layerListJSON },
            references,
          });

          savedObject.layerListJSON = attributes.layerListJSON;

          const indexPatternIds = references
            .filter(reference => {
              return reference.type === 'index-pattern';
            })
            .map(reference => {
              return reference.id;
            });
          savedObject.indexPatternIds = _.uniq(indexPatternIds);
        },

        // if this is null/undefined then the SavedObject will be assigned the defaults
        id: id,

        // default values that will get assigned if the doc is new
        defaults: {
          title: 'New Map',
          description: '',
        },
      });
      this.showInRecentlyAccessed = true;
    }
    getFullPath() {
      return `/app/maps#map/${this.id}`;
    }
    getLayerList() {
      return this.layerListJSON ? JSON.parse(this.layerListJSON) : null;
    }

    syncWithStore(state) {
      const layerList = getLayerListRaw(state);
      const layerListConfigOnly = copyPersistentState(layerList);
      this.layerListJSON = JSON.stringify(layerListConfigOnly);

      this.mapStateJSON = JSON.stringify({
        zoom: getMapZoom(state),
        center: getMapCenter(state),
        timeFilters: getTimeFilters(state),
        refreshConfig: getRefreshConfig(state),
        query: _.omit(getQuery(state), 'queryLastTriggeredAt'),
        filters: getFilters(state),
      });

      this.uiStateJSON = JSON.stringify({
        isLayerTOCOpen: getIsLayerTOCOpen(state),
        openTOCDetails: getOpenTOCDetails(state),
      });

      this.bounds = convertMapExtentToPolygon(getMapExtent(state));
    }
  }
  return SavedGisMap;
}

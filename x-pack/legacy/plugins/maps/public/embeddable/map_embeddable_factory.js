/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import chrome from 'ui/chrome';
import { capabilities } from 'ui/capabilities';
import { i18n } from '@kbn/i18n';
import {
  EmbeddableFactory,
  embeddableFactories,
  ErrorEmbeddable
} from '../../../../../../src/legacy/core_plugins/embeddable_api/public/index';
import { MapEmbeddable } from './map_embeddable';
import { indexPatternService } from '../kibana_services';

import { createMapPath, MAP_SAVED_OBJECT_TYPE, APP_ICON } from '../../common/constants';
import { createMapStore } from '../reducers/store';
import { addLayerWithoutDataSync } from '../actions/map_actions';
import { getQueryableUniqueIndexPatternIds } from '../selectors/map_selectors';
import '../angular/services/gis_map_saved_object_loader';
import 'ui/vis/map/service_settings';

export class MapEmbeddableFactory extends EmbeddableFactory {
  type = MAP_SAVED_OBJECT_TYPE;

  constructor() {
    super({
      savedObjectMetaData: {
        name: i18n.translate('xpack.maps.mapSavedObjectLabel', {
          defaultMessage: 'Map',
        }),
        type: MAP_SAVED_OBJECT_TYPE,
        getIconForSavedObject: () => APP_ICON,
      },
    });
  }
  isEditable() {
    return capabilities.get().maps.save;
  }

  // Not supported yet for maps types.
  canCreateNew() { return false; }

  getDisplayName() {
    return i18n.translate('xpack.maps.embeddableDisplayName', {
      defaultMessage: 'map',
    });
  }

  async _getIndexPatterns(layerListJSON) {
    // Need to extract layerList from store to get queryable index pattern ids
    const store = createMapStore();
    try {
      JSON.parse(layerListJSON).forEach(layerDescriptor => {
        store.dispatch(addLayerWithoutDataSync(layerDescriptor));
      });
    } catch (error) {
      throw new Error(i18n.translate('xpack.maps.mapEmbeddableFactory', {
        defaultMessage: 'Unable to load map, malformed saved object',
      }));
    }
    const queryableIndexPatternIds = getQueryableUniqueIndexPatternIds(store.getState());

    const promises = queryableIndexPatternIds.map(async (indexPatternId) => {
      try {
        return await indexPatternService.get(indexPatternId);
      } catch (error) {
        // Unable to load index pattern, better to not throw error so map embeddable can render
        // Error will be surfaced by map embeddable since it too will be unable to locate the index pattern
        return null;
      }
    });
    const indexPatterns = await Promise.all(promises);
    return _.compact(indexPatterns);
  }

  async createFromSavedObject(
    savedObjectId,
    input,
    parent
  ) {
    const $injector = await chrome.dangerouslyGetActiveInjector();
    const savedObjectLoader = $injector.get('gisMapSavedObjectLoader');

    const savedMap = await savedObjectLoader.get(savedObjectId);
    const indexPatterns = await this._getIndexPatterns(savedMap.layerListJSON);

    return new MapEmbeddable(
      {
        savedMap,
        editUrl: chrome.addBasePath(createMapPath(savedObjectId)),
        indexPatterns,
        editable: this.isEditable(),
      },
      input,
      parent
    );
  }

  async create(input) {
    window.location.href = chrome.addBasePath(createMapPath(''));
    return new ErrorEmbeddable('Maps can only be created from a saved object', input);
  }
}

embeddableFactories.set(MAP_SAVED_OBJECT_TYPE, new MapEmbeddableFactory());

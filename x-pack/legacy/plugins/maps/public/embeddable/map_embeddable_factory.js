/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { capabilities } from 'ui/capabilities';
import { i18n } from '@kbn/i18n';
import {
  EmbeddableFactory,
  ErrorEmbeddable
} from '../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { setup } from '../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
import { createMapPath, MAP_SAVED_OBJECT_TYPE, APP_ICON } from '../../common/constants';

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

  async create(input) {
    window.location.href = chrome.addBasePath(createMapPath(''));
    return new ErrorEmbeddable('Maps can only be created from a saved object', input);  }
}

setup.registerEmbeddableFactory(MAP_SAVED_OBJECT_TYPE, new MapEmbeddableFactory());

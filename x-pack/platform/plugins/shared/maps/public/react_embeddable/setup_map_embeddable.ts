/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { MapAttributes } from '../../common/content_management';
import { MAP_SAVED_OBJECT_TYPE, APP_ICON } from '../../common/constants';
import { untilPluginStartServicesReady } from '../kibana_services';
import { MapSerializedState } from './types';

export function setupMapEmbeddable(embeddableSetup: EmbeddableSetup) {
  embeddableSetup.registerReactEmbeddableFactory(MAP_SAVED_OBJECT_TYPE, async () => {
    const startServicesPromise = untilPluginStartServicesReady();
    const [, { mapEmbeddableFactory }] = await Promise.all([
      startServicesPromise,
      import('./embeddable_module'),
    ]);

    return mapEmbeddableFactory;
  });

  embeddableSetup.registerAddFromLibraryType<MapAttributes>({
    onAdd: (container, savedObject) => {
      container.addNewPanel<MapSerializedState>(
        {
          panelType: MAP_SAVED_OBJECT_TYPE,
          serializedState: {
            rawState: {
              savedObjectId: savedObject.id,
            },
          },
        },
        true
      );
    },
    savedObjectType: MAP_SAVED_OBJECT_TYPE,
    savedObjectName: i18n.translate('xpack.maps.mapSavedObjectLabel', {
      defaultMessage: 'Map',
    }),
    getIconForSavedObject: () => APP_ICON,
  });
}

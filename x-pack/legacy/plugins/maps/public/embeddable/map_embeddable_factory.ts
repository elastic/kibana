/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 Maintain legacy embeddable legacy present while apps switch over
 */

import { npSetup, npStart } from 'ui/new_platform';
import {
  bindSetupCoreAndPlugins,
  bindStartCoreAndPlugins,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../plugins/maps/public/plugin';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { MAP_SAVED_OBJECT_TYPE } from '../../../../../plugins/maps/common/constants';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { MapEmbeddableFactory } from '../../../../../plugins/maps/public/embeddable';

bindSetupCoreAndPlugins(npSetup.core, npSetup.plugins);
bindStartCoreAndPlugins(npStart.core, npStart.plugins);

export * from '../../../../../plugins/maps/public/embeddable/map_embeddable_factory';

npSetup.plugins.embeddable.registerEmbeddableFactory(
  MAP_SAVED_OBJECT_TYPE,
  new MapEmbeddableFactory()
);

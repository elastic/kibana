/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import {
  ADD_VECTOR_PROJECTION_ACTION_ID,
  VECTOR_PROJECTION_EMBEDDABLE_TYPE,
} from '../common/constants';
import { setServices } from './services';

interface SetupDeps {
  embeddable: EmbeddableSetup;
}

interface StartDeps {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  uiActions: UiActionsStart;
}

export class VectorProjectionPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  setup(_core: CoreSetup, { embeddable }: SetupDeps) {
    embeddable.registerEmbeddablePublicDefinition(VECTOR_PROJECTION_EMBEDDABLE_TYPE, async () => {
      const { vectorProjectionEmbeddableFactory } = await import('./async_services');
      return vectorProjectionEmbeddableFactory;
    });
    embeddable.registerLegacyURLTransform(VECTOR_PROJECTION_EMBEDDABLE_TYPE, async () => {
      const { transformOut } = await import('../common/transforms');
      return transformOut;
    });
  }

  start(core: CoreStart, { data, dataViews, uiActions }: StartDeps) {
    setServices({ core, data, dataViews });

    uiActions.registerActionAsync<EmbeddableApiContext>(
      ADD_VECTOR_PROJECTION_ACTION_ID,
      async () => {
        const { addVectorProjectionAction } = await import('./async_services');
        return addVectorProjectionAction;
      }
    );
    uiActions.attachAction(ADD_PANEL_TRIGGER, ADD_VECTOR_PROJECTION_ACTION_ID);
  }
}

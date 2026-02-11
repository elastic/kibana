/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
// Avoid importing Dashboard public constants here to prevent lens -> dashboard cycles.
const DASHBOARDS_APP_ID = 'dashboards';
const DASHBOARDS_PAGE_PATH = '#/list';
import type {
  LayerAction,
  RegisterLibraryAnnotationGroupFunction,
  LensStartServices as StartServices,
  StateSetter,
} from '@kbn/lens-common';
import type { XYState, XYAnnotationLayerConfig } from '../../types';
import { getUnlinkLayerAction } from './unlink_action';
import { getSaveLayerAction } from './save_action';
import { isByReferenceAnnotationsLayer } from '../../visualization_helpers';
import { getRevertChangesAction } from './revert_changes_action';

export const createAnnotationActions = ({
  state,
  layer,
  setState,
  registerLibraryAnnotationGroup,
  core,
  isSaveable,
  eventAnnotationService,
  savedObjectsTagging,
  dataViews,
  startServices,
}: {
  state: XYState;
  layer: XYAnnotationLayerConfig;
  setState: StateSetter<XYState, unknown>;
  registerLibraryAnnotationGroup: RegisterLibraryAnnotationGroupFunction;
  core: CoreStart;
  isSaveable?: boolean;
  eventAnnotationService: EventAnnotationServiceType;
  savedObjectsTagging?: SavedObjectTaggingPluginStart;
  dataViews: DataViewsContract;
  startServices: StartServices;
}): LayerAction[] => {
  const actions = [];

  const savingToLibraryPermitted = Boolean(
    core.application.capabilities.visualize_v2.save && isSaveable
  );

  if (savingToLibraryPermitted) {
    actions.push(
      getSaveLayerAction({
        state,
        layer,
        setState,
        registerLibraryAnnotationGroup,
        eventAnnotationService,
        toasts: core.notifications.toasts,
        savedObjectsTagging,
        dataViews,
        goToAnnotationLibrary: () =>
          core.application.navigateToApp(DASHBOARDS_APP_ID, {
            path: `${DASHBOARDS_PAGE_PATH}/annotations`,
          }),
        startServices,
      })
    );
  }

  if (isByReferenceAnnotationsLayer(layer)) {
    actions.push(
      getUnlinkLayerAction({
        state,
        layer,
        setState,
        toasts: core.notifications.toasts,
      })
    );

    actions.push(getRevertChangesAction({ state, layer, setState, core }));
  }

  return actions;
};

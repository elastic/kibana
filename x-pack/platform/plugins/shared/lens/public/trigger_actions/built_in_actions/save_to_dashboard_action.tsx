/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { createAction, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { isLensApi } from '../../react_embeddable/type_guards';
import type { LensPluginStartDependencies } from '../../plugin';
import { getSaveModalComponent } from '../../app_plugin/shared/saved_modal_lazy';
import { ACTION_SAVE_TO_DASHBOARD } from './constants';
import {
  getEffectiveTimeRange,
  getTelemetrySource,
  isBuiltInActionRequested,
  notifyBuiltInActionExecuted,
} from './helpers';

export const createSaveToDashboardAction = (
  core: CoreStart,
  startDependencies: LensPluginStartDependencies
) => {
  const SaveModal = getSaveModalComponent(core, startDependencies);

  return createAction<EmbeddableApiContext>({
    id: ACTION_SAVE_TO_DASHBOARD,
    type: ACTION_SAVE_TO_DASHBOARD,
    order: 16,
    getIconType: () => 'save',
    getDisplayName: () =>
      i18n.translate('xpack.lens.action.saveToDashboard', {
        defaultMessage: 'Save to dashboard',
      }),
    isCompatible: async ({ embeddable }) =>
      isLensApi(embeddable) &&
      isBuiltInActionRequested(embeddable, 'saveToDashboard') &&
      core.application.capabilities.dashboard_v2?.showWriteControls === true,
    execute: async ({ embeddable }) => {
      if (!isLensApi(embeddable)) throw new IncompatibleActionError();

      notifyBuiltInActionExecuted(embeddable, 'saveToDashboard');

      // the save modal renders its own overlay, so it is mounted on its own container
      const container = document.createElement('div');
      document.body.appendChild(container);
      const unmount = toMountPoint(
        <SaveModal
          initialInput={{
            ...embeddable.getLegacySerializedState(),
            time_range: getEffectiveTimeRange(embeddable),
          }}
          isSaveable={false}
          telemetrySource={getTelemetrySource(embeddable)}
          onClose={() => {
            unmount();
            container.remove();
          }}
        />,
        core
      )(container);
    },
  });
};

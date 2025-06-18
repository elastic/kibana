/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CanAddNewPanel } from '@kbn/presentation-containers';
import { tracksOverlays } from '@kbn/presentation-containers';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../query_client';
import type { EmbeddableAlertsTableConfig } from '../types';

export const openConfigEditor = async ({
  coreServices,
  parentApi,
  initialConfig,
}: {
  coreServices: CoreStart;
  parentApi: CanAddNewPanel;
  initialConfig?: EmbeddableAlertsTableConfig;
}): Promise<EmbeddableAlertsTableConfig> => {
  const { ConfigEditorFlyout } = await import('./config_editor_flyout');
  const { overlays, http, notifications, ...startServices } = coreServices;

  /**
   * If available, the parent API will keep track of which flyout is open and close it
   * if the app changes, disable certain actions when the flyout is open, etc.
   */
  const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;

  return new Promise((resolve, reject) => {
    const onSave = (newConfig: EmbeddableAlertsTableConfig) => {
      resolve(newConfig);
      flyoutSession.close();
      overlayTracker?.clearOverlays();
    };

    const onCancel = () => {
      reject();
      flyoutSession.close();
      overlayTracker?.clearOverlays();
    };

    const flyoutSession = overlays.openFlyout(
      toMountPoint(
        <QueryClientProvider client={queryClient}>
          <ConfigEditorFlyout
            initialConfig={initialConfig}
            onSave={onSave}
            onCancel={onCancel}
            services={{ http, notifications, overlays }}
          />
        </QueryClientProvider>,
        startServices
      ),
      {
        onClose: () => {
          onCancel();
        },
        size: 'm',
        maxWidth: 500,
        paddingSize: 'm',
        ownFocus: true,
        'data-test-subj': 'createAlertsTableEmbeddableFlyout',
      }
    );

    overlayTracker?.openOverlay(flyoutSession);
  });
};

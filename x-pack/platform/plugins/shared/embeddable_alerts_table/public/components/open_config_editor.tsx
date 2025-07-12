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
import { EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import { withSuspense } from '@kbn/shared-ux-utility';


const ConfigEditorFlyout = React.lazy(() => import('./config_editor_flyout'));

const FallbackComponent = (
  <EuiPanel className="eui-textCenter">
    <EuiLoadingSpinner size="l" />
  </EuiPanel>
);

const ConfigEditorFlyout1 = withSuspense(
  ConfigEditorFlyout,
  FallbackComponent
);

export const openConfigEditor = async ({
  coreServices, 
  parentApi,
  initialConfig,
}: {
  coreServices: CoreStart;
  parentApi: CanAddNewPanel;
  initialConfig?: EmbeddableAlertsTableConfig;
}): Promise<EmbeddableAlertsTableConfig> => {

  var t0 = performance.now();

  var t1 = performance.now();
  console.log('what is this crap', t1-t0  );
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

    var t1 = performance.now();
    console.log('what is this crap', t1-t0  );
    const flyoutSession = overlays.openFlyout(  // 80ms
      toMountPoint(
        <QueryClientProvider client={queryClient}>
          <ConfigEditorFlyout1
            initialConfig={initialConfig}
            onSave={onSave}
            onCancel={onCancel}
            services={{ http, notifications, overlays }}
          />
        </QueryClientProvider>,
        startServices
      ),
      {
        onClose: onCancel,
        size: 'm',
        maxWidth: 500,
        paddingSize: 'm',
        ownFocus: true,
        'data-test-subj': 'createAlertsTableEmbeddableFlyout',
      }
    );

    var t1 = performance.now();
    console.log('what is this crap', t1-t0  );

    overlayTracker?.openOverlay(flyoutSession);
  });
};

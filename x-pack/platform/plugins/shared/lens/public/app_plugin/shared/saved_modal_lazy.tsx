/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useEffect, useState } from 'react';

import { EuiLoadingSpinner, EuiOverlayMask } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { SaveModalContainerProps } from '../save_modal_container';
import type { LensPluginStartDependencies } from '../../plugin';
import type { LensAppServices } from '../types';
import type { DatasourceMap, VisualizationMap } from '../../types';

const SaveModal = React.lazy(() => import('../save_modal_container'));

function LoadingSpinnerWithOverlay() {
  return (
    <EuiOverlayMask>
      <EuiLoadingSpinner />
    </EuiOverlayMask>
  );
}

const LensSavedModalLazy = (props: SaveModalContainerProps) => {
  return (
    <Suspense fallback={<LoadingSpinnerWithOverlay />}>
      <SaveModal {...props} />
    </Suspense>
  );
};

export function getSaveModalComponent(
  coreStart: CoreStart,
  startDependencies: LensPluginStartDependencies,
  initEditorFrame: () => Promise<{
    datasourceMap: DatasourceMap;
    visualizationMap: VisualizationMap;
  }>
) {
  return (props: Omit<SaveModalContainerProps, 'lensServices'>) => {
    const [lensServices, setLensServices] = useState<LensAppServices>();
    const [assets, setAssets] = useState<
      | {
          datasourceMap: DatasourceMap;
          visualizationMap: VisualizationMap;
        }
      | undefined
    >();

    useEffect(() => {
      async function loadLensService() {
        const { getLensServices, getLensAttributeService } = await import('../../async_services');

        const lensServicesT = await getLensServices(
          coreStart,
          startDependencies,
          getLensAttributeService(coreStart, startDependencies)
        );

        const { visualizationMap, datasourceMap } = await initEditorFrame();
        setAssets({ visualizationMap, datasourceMap });
        setLensServices(lensServicesT);
      }
      loadLensService();
    }, []);

    if (!lensServices || !assets) {
      return <LoadingSpinnerWithOverlay />;
    }

    return (
      <EuiOverlayMask>
        <LensSavedModalLazy
          {...props}
          lensServices={lensServices}
          visualizationMap={assets?.visualizationMap}
          datasourceMap={assets?.datasourceMap}
        />
      </EuiOverlayMask>
    );
  };
}

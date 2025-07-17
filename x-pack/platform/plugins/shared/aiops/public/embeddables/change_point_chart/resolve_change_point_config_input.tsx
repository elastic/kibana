/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { openLazyFlyout } from '@kbn/presentation-util';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React from 'react';
import { AiopsAppContext } from '../../hooks/use_aiops_app_context';
import type { AiopsPluginStartDeps } from '../../types';
import { ChangePointChartInitializer } from './change_point_chart_initializer';
import type { ChangePointEmbeddableState } from './types';

export async function resolveEmbeddableChangePointUserInput(
  coreStart: CoreStart,
  pluginStart: AiopsPluginStartDeps,
  parentApi: unknown,
  focusedPanelId: string,
  onConfirm: (state: ChangePointEmbeddableState) => void,
  input?: ChangePointEmbeddableState
) {
  openLazyFlyout({
    core: coreStart,
    parentApi,
    flyoutProps: {
      'data-test-subj': 'aiopsChangePointChartEmbeddableInitializer',
      'aria-labelledby': 'changePointConfig',
    },
    uuid: focusedPanelId,
    loadContent: async ({ closeFlyout }) => {
      return (
        <AiopsAppContext.Provider
          value={{
            embeddingOrigin: 'flyout',
            ...coreStart,
            ...pluginStart,
          }}
        >
          <ChangePointChartInitializer
            initialInput={input}
            onCreate={(update) => {
              onConfirm(update);
              closeFlyout();
            }}
            onCancel={() => {
              closeFlyout();
            }}
          />
        </AiopsAppContext.Provider>
      );
    },
  });
  // return new Promise(async (resolve, reject) => {
  //   try {
    

  //     // const flyoutSession = coreStart.overlays.openFlyout(
  //     //   toMountPoint(
  //     //     <AiopsAppContext.Provider
  //     //       value={{
  //     //         embeddingOrigin: 'flyout',
  //     //         ...coreStart,
  //     //         ...pluginStart,
  //     //       }}
  //     //     >
  //     //       <ChangePointChartInitializer
  //     //         initialInput={input}
  //     //         onCreate={(update) => {
  //     //           resolve(update);
  //     //           flyoutSession.close();
  //     //           overlayTracker?.clearOverlays();
  //     //         }}
  //     //         onCancel={() => {
  //     //           reject();
  //     //           flyoutSession.close();
  //     //           overlayTracker?.clearOverlays();
  //     //         }}
  //     //       />
  //     //     </AiopsAppContext.Provider>,
  //     //     coreStart
  //     //   ),
  //     //   {
  //     //     ownFocus: true,
  //     //     size: 's',
  //     //     type: 'push',
  //     //     'data-test-subj': 'aiopsChangePointChartEmbeddableInitializer',
  //     //     'aria-labelledby': 'changePointConfig',
  //     //     onClose: () => {
  //     //       reject();
  //     //       flyoutSession.close();
  //     //       overlayTracker?.clearOverlays();
  //     //     },
  //     //   }
  //     // );

  //     // if (tracksOverlays(parentApi)) {
  //     //   parentApi.openOverlay(flyoutSession, { focusedPanelId });
  //     // }
  //   } catch (error) {
  //     reject(error);
  //   }
  // });
}

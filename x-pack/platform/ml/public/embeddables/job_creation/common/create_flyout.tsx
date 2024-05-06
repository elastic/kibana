/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { takeUntil, distinctUntilChanged, skip } from 'rxjs/operators';
import { from } from 'rxjs';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';

import { getMlGlobalServices } from '../../../application/app';

export interface FlyoutComponentProps {
  onClose: () => void;
}

export function createFlyout(
  FlyoutComponent: React.FunctionComponent<any>,
  coreStart: CoreStart,
  share: SharePluginStart,
  data: DataPublicPluginStart,
  dashboardService: DashboardStart,
  lens?: LensPublicStart
): Promise<void> {
  const {
    http,
    theme,
    i18n,
    overlays,
    application: { currentAppId$ },
  } = coreStart;

  return new Promise(async (resolve, reject) => {
    try {
      const onFlyoutClose = () => {
        flyoutSession.close();
        resolve();
      };

      const flyoutSession = overlays.openFlyout(
        toMountPoint(
          <KibanaContextProvider
            services={{
              ...coreStart,
              share,
              data,
              lens,
              dashboardService,
              mlServices: getMlGlobalServices(http, data.dataViews),
            }}
          >
            <FlyoutComponent
              onClose={() => {
                onFlyoutClose();
                resolve();
              }}
            />
          </KibanaContextProvider>,
          { theme, i18n }
        ),
        {
          'data-test-subj': 'mlFlyoutLayerSelector',
          ownFocus: true,
          onClose: onFlyoutClose,
          size: '35vw',
        }
      );

      // Close the flyout when user navigates out of the current plugin
      currentAppId$
        .pipe(skip(1), takeUntil(from(flyoutSession.onClose)), distinctUntilChanged())
        .subscribe(() => {
          flyoutSession.close();
        });
    } catch (error) {
      reject(error);
    }
  });
}

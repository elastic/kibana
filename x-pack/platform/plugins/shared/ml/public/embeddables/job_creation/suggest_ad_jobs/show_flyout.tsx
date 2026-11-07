/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { CPSPluginStart } from '@kbn/cps/public/types';
import type { SuggestADJobsContext } from '@kbn/ml-ui-actions';
import { createFlyout, type FlyoutComponentProps } from '../common/create_flyout';
import { SuggestADJobsFlyout } from './flyout/flyout';

export async function showSuggestADJobsFlyout(
  coreStart: CoreStart,
  share: SharePluginStart,
  data: DataPublicPluginStart,
  dashboardService: DashboardStart,
  cps: CPSPluginStart | undefined,
  { indexPattern, dataViewId, savedSearchId, projectRouting, onClose }: SuggestADJobsContext
): Promise<void> {
  const Comp: FC<FlyoutComponentProps> = ({ onClose: closeFlyout }) => (
    <SuggestADJobsFlyout
      indexPattern={indexPattern}
      dataViewId={dataViewId}
      savedSearchId={savedSearchId}
      projectRouting={projectRouting}
      onClose={() => {
        closeFlyout();
        onClose?.();
      }}
    />
  );
  return createFlyout(Comp, coreStart, share, data, dashboardService, undefined, cps);
}

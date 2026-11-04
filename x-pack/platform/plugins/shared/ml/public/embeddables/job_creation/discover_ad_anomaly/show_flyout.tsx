/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import { KibanaContextProvider, useKibana } from '@kbn/kibana-react-plugin/public';
import type { DiscoverADAnomalyContext } from '@kbn/ml-ui-actions';
import type { MlStartDependencies } from '../../../plugin';
import { createFlyout, type FlyoutComponentProps } from '../common/create_flyout';
import { DiscoverADAnomalyFlyout } from './flyout';

// The charts and table use the other plugins' services, as the Anomaly Explorer page provides them
const WithPluginServices: FC<PropsWithChildren<{ pluginsStart: MlStartDependencies }>> = ({
  pluginsStart,
  children,
}) => {
  const { services } = useKibana();
  return (
    <KibanaContextProvider services={{ ...services, ...pluginsStart }}>
      {children}
    </KibanaContextProvider>
  );
};

export async function showDiscoverADAnomalyFlyout(
  coreStart: CoreStart,
  share: SharePluginStart,
  data: DataPublicPluginStart,
  dashboardService: DashboardStart,
  pluginsStart: MlStartDependencies,
  { jobId, timestamp, endTimestamp, score, onClose }: DiscoverADAnomalyContext,
  isAiAvailable = false
): Promise<void> {
  const Comp: FC<FlyoutComponentProps> = () => (
    <WithPluginServices pluginsStart={pluginsStart}>
      <DiscoverADAnomalyFlyout
        jobId={jobId}
        timestamp={timestamp}
        endTimestamp={endTimestamp}
        score={score}
        isAiAvailable={isAiAvailable}
      />
    </WithPluginServices>
  );

  // A resizable push flyout, so the chart stays usable beside it
  await createFlyout(Comp, coreStart, share, data, dashboardService, undefined, undefined, {
    type: 'push',
    resizable: true,
    ownFocus: false,
    'aria-labelledby': 'mlDiscoverADAnomalyFlyoutTitle',
    'data-test-subj': 'mlDiscoverADAnomalyFlyout',
  });
  onClose?.();
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { CoreStart } from '@kbn/core/public';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';

interface ShowPinnedDashboardToastParams {
  dashboardId: string;
  title: string;
  core: CoreStart;
  locator: LocatorPublic<DashboardLocatorParams> | undefined;
}

export const showPinnedDashboardToast = ({
  dashboardId,
  title,
  core,
  locator,
}: ShowPinnedDashboardToastParams): void => {
  const toast = core.notifications.toasts.addSuccess({
    title: i18n.translate('xpack.dashboardAgent.pinnedToast.title', {
      defaultMessage: `Dashboard ''{title}'' created`,
      values: { title },
    }),
    text: locator
      ? toMountPoint(
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                onClick={async () => {
                  core.notifications.toasts.remove(toast);
                  await locator.navigate({ dashboardId, viewMode: 'edit' });
                }}
              >
                {i18n.translate('xpack.dashboardAgent.pinnedToast.viewButton', {
                  defaultMessage: 'View dashboard',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>,
          core
        )
      : undefined,
  });
};

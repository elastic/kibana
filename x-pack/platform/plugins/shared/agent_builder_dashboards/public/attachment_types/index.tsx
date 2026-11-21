/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  EMPTY,
  from,
  map,
  switchMap,
} from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { i18n } from '@kbn/i18n';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { ChromeStart, NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UpdateOriginResponse } from '@kbn/agent-builder-common';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import type {
  DashboardApi,
  DashboardRendererProps,
  DashboardStart,
} from '@kbn/dashboard-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { DashboardCanvasAttachmentProps } from './async_services';
import type { ShownAttachmentVersion } from './dashboard_integration/dashboard_app_integration';
import type { CanvasDashboardRegistry } from './canvas_dashboard_registry';

export interface IdGenerator {
  readonly current: string;
  next: () => string;
}

export const createIdGenerator = (): IdGenerator => {
  let id = uuidv4();
  return {
    get current() {
      return id;
    },
    next() {
      id = uuidv4();
      return id;
    },
  };
};

const LazyDashboardCanvasAttachment = React.lazy(async () => {
  const { DashboardCanvasAttachment } = await import('./async_services');

  return {
    default: DashboardCanvasAttachment,
  };
});

export const registerDashboardAttachmentUiDefinition = ({
  agentBuilder,
  chrome,
  dashboardLocator,
  unifiedSearch,
  data,
  dashboardPlugin,
  canWriteDashboards,
  draftAttachmentId,
  toasts,
  canvasDashboards,
}: {
  agentBuilder: AgentBuilderPluginStart;
  chrome: ChromeStart;
  dashboardLocator?: DashboardRendererProps['locator'];
  unifiedSearch: UnifiedSearchPublicPluginStart;
  data: DataPublicPluginStart;
  dashboardPlugin: DashboardStart;
  canWriteDashboards: boolean;
  draftAttachmentId: IdGenerator;
  toasts: NotificationsStart['toasts'];
  canvasDashboards: CanvasDashboardRegistry;
}): (() => void) => {
  let dashboardApi: DashboardApi | undefined;
  const findDashboardsServicePromise = dashboardPlugin.findDashboardsService();
  const checkSavedDashboardExist = async (dashboardId: string) => {
    const findDashboardsService = await findDashboardsServicePromise;
    const result = await findDashboardsService.findById(dashboardId);
    return result.status === 'success';
  };

  // TODO: this should be replaced by making sure `agentBuilder.updateAttachmentOrigin`
  // keeps the conversation in sync by invalidating conversation - it doesn't do it atm.
  // Captured from `getActionButtons` so that non-UI integrations (e.g. origin sync on
  // dashboard save) can reuse the framework-provided `updateOrigin`, which both persists
  // the origin and invalidates the conversation. Unlike `agentBuilder.updateAttachmentOrigin`
  // (plugin start contract), this keeps the rendered attachment in sync without a full refetch.
  const updateOriginByAttachmentId = new Map<
    string,
    (origin: string) => Promise<UpdateOriginResponse | undefined>
  >();

  const shownAttachmentVersion$ = new BehaviorSubject<ShownAttachmentVersion | undefined>(
    undefined
  );

  const dashboardAppApiSubscription = combineLatest([
    dashboardPlugin.dashboardAppClientApi$,
    chrome.sidebar.getCurrentAppId$(),
  ])
    .pipe(
      switchMap(([api, appId]) => {
        // maintains a dashboardApi reference for access in getActionButtons
        dashboardApi = api;
        // integrates dashboard app with agent only when both dashboard and chat are active
        const isAgentOpen = appId === 'agentBuilder';
        return api && isAgentOpen
          ? from(import('./async_services')).pipe(
              switchMap(({ createDashboardAppIntegration$ }) =>
                createDashboardAppIntegration$({
                  agentBuilder,
                  api,
                  areEqual: dashboardPlugin.areEqual,
                  canWriteDashboards,
                  dashboardLocator,
                  toasts,
                  draftAttachmentId,
                  checkSavedDashboardExist,
                  setShownAttachmentVersion: (shown) => shownAttachmentVersion$.next(shown),
                  getUpdateOrigin: (attachmentId) => updateOriginByAttachmentId.get(attachmentId),
                })
              )
            )
          : EMPTY;
      })
    )
    .subscribe();
  agentBuilder.attachments.addAttachmentType<DashboardAttachment>(DASHBOARD_ATTACHMENT_TYPE, {
    getLabel: (attachment) => {
      return (
        attachment.data?.title ||
        i18n.translate('xpack.agentBuilderDashboards.attachments.dashboard.label', {
          defaultMessage: 'New Dashboard',
        })
      );
    },
    getIcon: () => 'productDashboard',
    renderCanvasContent: (props, callbacks) => (
      <React.Suspense fallback={null}>
        <LazyDashboardCanvasAttachment
          {...(props as DashboardCanvasAttachmentProps)}
          {...callbacks}
          dashboardLocator={dashboardLocator}
          searchBarComponent={unifiedSearch.ui.SearchBar}
          data={data}
          checkSavedDashboardExist={checkSavedDashboardExist}
          canWriteDashboards={canWriteDashboards}
          registerCanvasDashboard={canvasDashboards.register}
        />
      </React.Suspense>
    ),
    getPreviewState$: ({ id, versionData }) =>
      shownAttachmentVersion$.pipe(
        map((shown) =>
          shown?.attachmentId === id && shown.version === versionData?.version
            ? 'previewing'
            : 'none'
        ),
        distinctUntilChanged()
      ),
    getActionButtons: ({ attachment, openCanvas, isCanvas, isSidebar, updateOrigin }) => {
      // Capture the framework-provided updater keyed by attachment id so that
      // dashboard-save origin sync (outside the React tree) can reuse it.
      updateOriginByAttachmentId.set(attachment.id, updateOrigin);
      if (isCanvas) {
        return [];
      }
      return [
        {
          label: i18n.translate(
            'xpack.agentBuilderDashboards.attachments.dashboard.previewActionLabel',
            {
              defaultMessage: 'Preview',
            }
          ),
          icon: 'eye',
          type: ActionButtonType.SECONDARY,
          handler: async () => {
            const { handlePreview } = await import('./async_services');

            return handlePreview({
              attachment,
              dashboardApi,
              canWriteDashboards,
              isSidebar,
              dashboardLocator,
              toasts,
              checkSavedDashboardExist,
              openCanvas,
            });
          },
        },
      ];
    },
  });

  return () => {
    dashboardAppApiSubscription.unsubscribe();
    dashboardApi = undefined;
    updateOriginByAttachmentId.clear();
    shownAttachmentVersion$.complete();
  };
};

export { registerDashboardPanelAttachmentUiDefinition } from './dashboard_panel_ui_definition';
export {
  createCanvasDashboardRegistry,
  type CanvasDashboard,
  type CanvasDashboardRegistry,
} from './canvas_dashboard_registry';

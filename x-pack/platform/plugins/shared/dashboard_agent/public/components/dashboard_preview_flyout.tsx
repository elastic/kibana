/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { Observable } from 'rxjs';
import {
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiProgress,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { isToolUiEvent, type ToolUiEvent } from '@kbn/agent-builder-common/chat/events';
import type { BrowserChatEvent } from '@kbn/agent-builder-browser/events';
import { DashboardRenderer, type DashboardApi } from '@kbn/dashboard-plugin/public';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-plugin/public';
import {
  DASHBOARD_EVENTS,
  MARKDOWN_EMBEDDABLE_TYPE,
  type DashboardSessionCreatedData,
  type DashboardPanelAddedData,
} from '../../common';

interface DashboardPreviewFlyoutProps {
  events$: Observable<BrowserChatEvent>;
  initialEvent: ToolUiEvent<typeof DASHBOARD_EVENTS.SESSION_CREATED, DashboardSessionCreatedData>;
}

/**
 * Adds a panel to the dashboard API.
 */
async function addPanel(api: DashboardApi, panelType: string, rawState: object): Promise<boolean> {
  try {
    await api.addNewPanel({
      panelType,
      serializedState: { rawState },
    });
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to add ${panelType} panel to dashboard:`, error);
    return false;
  }
}

const DashboardPreviewFlyout: React.FC<DashboardPreviewFlyoutProps> = ({
  events$,
  initialEvent,
}) => {
  const [dashboardApi, setDashboardApi] = useState<DashboardApi | null>(null);
  const [title, setTitle] = useState(initialEvent.data.data.title);
  const [panelCount, setPanelCount] = useState(0);
  const [isFinalized, setIsFinalized] = useState(false);
  const panelQueueRef = useRef<DashboardPanelAddedData[]>([]);
  const markdownAddedRef = useRef(false);
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'dashboardPreviewFlyout' });

  const addLensPanel = useCallback(
    async (api: DashboardApi, panel: object) => {
      const success = await addPanel(api, LENS_EMBEDDABLE_TYPE, panel);
      if (success) {
        setPanelCount((prev) => prev + 1);
      }
    },
    [setPanelCount]
  );

  const processQueuedPanels = useCallback(
    async (api: DashboardApi) => {
      while (panelQueueRef.current.length > 0) {
        const panelData = panelQueueRef.current.shift();
        if (panelData) {
          await addLensPanel(api, panelData.panel as object);
        }
      }
    },
    [addLensPanel]
  );

  const handleApiAvailable = useCallback(
    async (api: DashboardApi) => {
      setDashboardApi(api);

      // Add the initial markdown panel
      const { markdownContent } = initialEvent.data.data;
      if (markdownContent && !markdownAddedRef.current) {
        markdownAddedRef.current = true;
        await addPanel(api, MARKDOWN_EMBEDDABLE_TYPE, { content: markdownContent });
      }

      // Process any panels that were queued before API was available
      await processQueuedPanels(api);
    },
    [initialEvent.data.data, processQueuedPanels]
  );

  useEffect(
    function subscribeToChatEvents() {
      const subscription = events$.subscribe(async (event) => {
        if (
          isToolUiEvent<typeof DASHBOARD_EVENTS.SESSION_CREATED, DashboardSessionCreatedData>(
            event,
            DASHBOARD_EVENTS.SESSION_CREATED
          )
        ) {
          setTitle(event.data.data?.title);
        }

        if (
          isToolUiEvent<typeof DASHBOARD_EVENTS.PANEL_ADDED, DashboardPanelAddedData>(
            event,
            DASHBOARD_EVENTS.PANEL_ADDED
          )
        ) {
          const { panel } = event.data.data;

          if (dashboardApi) {
            await addLensPanel(dashboardApi, panel as object);
          } else {
            // Queue the panel for when API becomes available
            panelQueueRef.current.push(event.data.data);
          }
        }

        if (isToolUiEvent(event, DASHBOARD_EVENTS.FINALIZED)) {
          setIsFinalized(true);
        }
      });

      return () => subscription.unsubscribe();
    },
    [events$, dashboardApi, addLensPanel]
  );

  return (
    <>
      <EuiFlyoutHeader hasBorder aria-labelledby={flyoutTitleId}>
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>{isFinalized ? title : `Building: ${title}`}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={isFinalized ? 'success' : 'primary'}>
              {isFinalized ? `Saved ${panelCount} panels` : `${panelCount} panels`}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        {!isFinalized && <EuiProgress size="xs" color="primary" />}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <DashboardRenderer
          getCreationOptions={async () => ({
            getInitialInput: () => ({
              viewMode: 'view' as const,
              timeRange: { from: 'now-15m', to: 'now' },
            }),
            isEmbeddedExternally: true,
          })}
          onApiAvailable={handleApiAvailable}
        />
      </EuiFlyoutBody>
    </>
  );
};

export function openDashboardPreviewFlyout({
  core,
  events$,
  initialEvent,
}: {
  core: CoreStart;
  events$: Observable<BrowserChatEvent>;
  initialEvent: ToolUiEvent<typeof DASHBOARD_EVENTS.SESSION_CREATED, DashboardSessionCreatedData>;
}): { close: () => void } {
  const overlayRef = core.overlays.openFlyout(
    toMountPoint(<DashboardPreviewFlyout events$={events$} initialEvent={initialEvent} />, {
      theme: core.theme,
      i18n: core.i18n,
    }),
    {
      size: 'm',
      type: 'push',
      ownFocus: false,
      'data-test-subj': 'dashboardPreviewFlyout',
      isResizable: true,
    }
  );

  return { close: () => overlayRef.close() };
}

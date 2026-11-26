/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { apiPublishesESQLVariables } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import {
  apiCanCancelRequests,
  apiPublishesBlockingError,
  apiPublishesDataLoading,
  apiPublishesReload,
  apiPublishesRendered,
  apiPublishesTimeRange,
  apiPublishesUnifiedSearch,
  type HasSerializedChildState,
  type PanelPackage,
} from '@kbn/presentation-publishing';
import { KbnDangerCallout } from '@kbn/ui-callout';
import React, { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { combineLatest, of, Subscription } from 'rxjs';

const DEFAULT_PREVIEW_DEBOUNCE_MS = 400;

export type ChangePointPreviewStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ChangePointPreviewStateUpdate {
  readonly key: string | undefined;
  readonly status: ChangePointPreviewStatus;
}

/**
 * Builds a transient parent API for EmbeddableRenderer so the preview receives its serialized
 * state and dashboard search context without registering a child or dirtying the dashboard.
 */
export const createPreviewParentApi = <SerializedState extends object>(
  dashboardParentApi: unknown,
  serializedState: SerializedState
): HasSerializedChildState<SerializedState> => ({
  getSerializedStateForChild: () => serializedState,
  ...(apiPublishesTimeRange(dashboardParentApi)
    ? {
        timeRange$: dashboardParentApi.timeRange$,
        ...(dashboardParentApi.timeslice$ ? { timeslice$: dashboardParentApi.timeslice$ } : {}),
      }
    : {}),
  ...(apiPublishesUnifiedSearch(dashboardParentApi)
    ? {
        filters$: dashboardParentApi.filters$,
        query$: dashboardParentApi.query$,
      }
    : {}),
  ...(apiPublishesESQLVariables(dashboardParentApi)
    ? { esqlVariables$: dashboardParentApi.esqlVariables$ }
    : {}),
  ...(apiPublishesReload(dashboardParentApi) ? { reload$: dashboardParentApi.reload$ } : {}),
});

interface DebouncedPreviewTarget {
  readonly instanceId: number;
  readonly key: string;
  readonly panelPackage: PanelPackage;
}

export interface ChangePointPanelPreviewProps {
  readonly panelPackage: PanelPackage | undefined;
  readonly previewKey: string | undefined;
  readonly structuralError?: string;
  readonly dashboardParentApi: unknown;
  readonly debounceMs?: number;
  readonly onStatusChange: (update: ChangePointPreviewStateUpdate) => void;
}

export const ChangePointPanelPreview: FC<ChangePointPanelPreviewProps> = ({
  panelPackage,
  previewKey,
  structuralError,
  dashboardParentApi,
  debounceMs = DEFAULT_PREVIEW_DEBOUNCE_MS,
  onStatusChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const [debouncedTarget, setDebouncedTarget] = useState<DebouncedPreviewTarget | undefined>(
    undefined
  );
  const [renderedStatus, setRenderedStatus] = useState<{
    readonly key: string;
    readonly status: ChangePointPreviewStatus;
  }>({ key: '', status: 'idle' });

  const activeSubscriptionRef = useRef<Subscription | undefined>(undefined);
  const activeApiRef = useRef<unknown>(undefined);
  const latestDebouncedKeyRef = useRef<string | undefined>(undefined);
  const nextInstanceIdRef = useRef(0);

  const cleanupActivePreviewApi = useCallback(() => {
    activeSubscriptionRef.current?.unsubscribe();
    activeSubscriptionRef.current = undefined;
    if (apiCanCancelRequests(activeApiRef.current)) {
      activeApiRef.current.cancelRequests();
    }
    activeApiRef.current = undefined;
  }, []);

  useEffect(() => cleanupActivePreviewApi, [cleanupActivePreviewApi]);

  useEffect(() => {
    if (structuralError || !previewKey || !panelPackage) {
      cleanupActivePreviewApi();
      latestDebouncedKeyRef.current = undefined;
      setDebouncedTarget(undefined);
      return;
    }

    if (latestDebouncedKeyRef.current === previewKey) {
      return;
    }

    const timeoutId = setTimeout(() => {
      cleanupActivePreviewApi();
      nextInstanceIdRef.current += 1;
      latestDebouncedKeyRef.current = previewKey;
      setRenderedStatus({ key: previewKey, status: 'loading' });
      setDebouncedTarget({
        instanceId: nextInstanceIdRef.current,
        key: previewKey,
        panelPackage,
      });
    }, debounceMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [cleanupActivePreviewApi, debounceMs, panelPackage, previewKey, structuralError]);

  const effectiveStatus: ChangePointPreviewStatus = useMemo(() => {
    if (structuralError) {
      return 'error';
    }
    if (!previewKey || !panelPackage) {
      return 'idle';
    }
    if (!debouncedTarget || debouncedTarget.key !== previewKey) {
      return 'loading';
    }
    if (renderedStatus.key !== previewKey) {
      return 'loading';
    }
    return renderedStatus.status;
  }, [debouncedTarget, panelPackage, previewKey, renderedStatus, structuralError]);

  useEffect(() => {
    onStatusChange({ key: previewKey, status: effectiveStatus });
  }, [effectiveStatus, onStatusChange, previewKey]);

  const previewContainerCss = useMemo(
    () =>
      css({
        height: 320,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
        borderRadius: euiTheme.border.radius.medium,
      }),
    [euiTheme]
  );

  if (structuralError) {
    return (
      <div data-test-subj="aiopsChangePointPreview" data-preview-status="error">
        <KbnDangerCallout
          size="s"
          data-test-subj="aiopsChangePointStructuralError"
          title={i18n.translate('xpack.aiops.embeddableChangePointChart.invalidQueryTitle', {
            defaultMessage: 'Invalid change point ES|QL query',
          })}
          text={structuralError}
        />
      </div>
    );
  }

  if (!previewKey || !panelPackage) {
    return (
      <EuiPanel
        hasShadow={false}
        hasBorder
        paddingSize="m"
        data-test-subj="aiopsChangePointPreview"
        data-preview-status="idle"
      >
        <EuiEmptyPrompt
          titleSize="xs"
          title={
            <h3>
              {i18n.translate('xpack.aiops.embeddableChangePointChart.previewEmptyTitle', {
                defaultMessage: 'Preview unavailable',
              })}
            </h3>
          }
          body={
            <p>
              {i18n.translate('xpack.aiops.embeddableChangePointChart.previewEmptyDescription', {
                defaultMessage:
                  'Select a time-based data view and metric field to preview change point detection.',
              })}
            </p>
          }
        />
      </EuiPanel>
    );
  }

  return (
    <div
      css={previewContainerCss}
      data-test-subj={
        effectiveStatus === 'ready'
          ? 'aiopsChangePointPreview aiopsChangePointPreviewReady'
          : 'aiopsChangePointPreview'
      }
      data-preview-status={effectiveStatus}
    >
      {debouncedTarget ? (
        <PreviewEmbeddableInstance
          key={debouncedTarget.instanceId}
          generationKey={debouncedTarget.key}
          panelPackage={debouncedTarget.panelPackage}
          dashboardParentApi={dashboardParentApi}
          onGenerationStatus={(generationKey, status, api, subscription) => {
            if (latestDebouncedKeyRef.current !== generationKey) {
              subscription.unsubscribe();
              if (apiCanCancelRequests(api)) {
                api.cancelRequests();
              }
              return;
            }
            activeApiRef.current = api;
            activeSubscriptionRef.current = subscription;
            setRenderedStatus({ key: generationKey, status });
          }}
        />
      ) : null}
    </div>
  );
};

const PreviewEmbeddableInstance: FC<{
  readonly generationKey: string;
  readonly panelPackage: PanelPackage;
  readonly dashboardParentApi: unknown;
  readonly onGenerationStatus: (
    generationKey: string,
    status: ChangePointPreviewStatus,
    api: unknown,
    subscription: Subscription
  ) => void;
}> = ({ generationKey, panelPackage, dashboardParentApi, onGenerationStatus }) => {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const getParentApi = useCallback(
    () => createPreviewParentApi(dashboardParentApi, panelPackage.serializedState ?? {}),
    [dashboardParentApi, panelPackage.serializedState]
  );

  const handleApiAvailable = useCallback(
    (api: unknown) => {
      if (!isMountedRef.current) {
        if (apiCanCancelRequests(api)) {
          api.cancelRequests();
        }
        return;
      }

      const loading$ = apiPublishesDataLoading(api) ? api.dataLoading$ : of(false);
      const blockingError$ = apiPublishesBlockingError(api) ? api.blockingError$ : of(undefined);
      const rendered$ = apiPublishesRendered(api) ? api.rendered$ : of(true);

      const subscription = new Subscription();
      subscription.add(
        combineLatest({
          isLoading: loading$,
          blockingError: blockingError$,
          isRendered: rendered$,
        }).subscribe(({ isLoading, blockingError, isRendered }) => {
          if (!isMountedRef.current) {
            return;
          }
          if (blockingError) {
            onGenerationStatus(generationKey, 'error', api, subscription);
            return;
          }
          if (isLoading || !isRendered) {
            onGenerationStatus(generationKey, 'loading', api, subscription);
            return;
          }
          onGenerationStatus(generationKey, 'ready', api, subscription);
        })
      );
    },
    [generationKey, onGenerationStatus]
  );

  return (
    <EmbeddableRenderer
      type={panelPackage.panelType}
      getParentApi={getParentApi}
      onApiAvailable={handleApiAvailable}
      hidePanelChrome={true}
    />
  );
};

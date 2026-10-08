/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  finalize,
  from,
  map,
  merge,
  of,
  skip,
  switchMap,
  tap,
} from 'rxjs';
import type {
  DefaultEmbeddableApi,
  EmbeddablePublicDefinition,
} from '@kbn/embeddable-plugin/public';
import type {
  FetchContext,
  HasEditCapabilities,
  HasTypeDisplayName,
  PublishesBlockingError,
  PublishesDataLoading,
} from '@kbn/presentation-publishing';
import {
  fetch$,
  initializeStateApi,
  initializeTitleManager,
  titleComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { openLazyFlyout } from '@kbn/presentation-util';
import { i18n } from '@kbn/i18n';
import { loadConnectors, type AIConnector } from '@kbn/inference-connectors';
import {
  AI_INSIGHTS_API_PATH,
  AI_INSIGHTS_COLLAPSED_GRID_HEIGHT,
  AI_INSIGHTS_CONNECTOR_FEATURE_ID,
  AI_INSIGHTS_DEFAULT_GRID_HEIGHT,
  AI_INSIGHTS_EMBEDDABLE_TYPE,
  AI_INSIGHTS_GENERATION_MODE,
  AI_INSIGHTS_HEIGHT_MODE,
  AI_INSIGHTS_REFRESH_MODE,
  AI_INSIGHTS_STRIP_GRID_HEIGHT,
} from '../../common/ai_insights/constants';
import type {
  AiInsightsGenerationMode,
  AiInsightsHeightMode,
  AiInsightsRefreshMode,
  AiInsightsResult,
} from '../../common/ai_insights/types';
import type { AiInsightsEmbeddableState } from '../../server/embeddable/ai_insights_schema';
import { AiInsightsPanel } from './ai_insights_panel';
import { buildDashboardContext, summarizeFilters, summarizeQuery } from './build_dashboard_context';
import { getAiInsightsContextFingerprint } from './context_fingerprint';
import {
  AI_INSIGHTS_COLLAPSED_MAX_GRID_HEIGHT,
  AI_INSIGHTS_STRIP_MAX_GRID_HEIGHT,
  contentHeightToGridRows,
  getAiInsightsPanelGridHeight,
  setAiInsightsPanelGridHeight,
} from './resize_panel_height';
import { getAiInsightsServices } from './services';

export type AiInsightsApi = DefaultEmbeddableApi<AiInsightsEmbeddableState> &
  HasTypeDisplayName &
  HasEditCapabilities &
  PublishesDataLoading &
  PublishesBlockingError;

function pickDefaultConnector(connectors: AIConnector[]): AIConnector | undefined {
  const valid = connectors.filter((connector) => !connector.isMissingSecrets);
  return valid.find((connector) => connector.isRecommended) ?? valid[0];
}

export const aiInsightsEmbeddableFactory: EmbeddablePublicDefinition<
  AiInsightsEmbeddableState,
  AiInsightsApi
> = {
  type: AI_INSIGHTS_EMBEDDABLE_TYPE,
  getPlacementHints: () => ({
    width: 48,
    // New panels start as a compact CTA strip until insights exist.
    height: AI_INSIGHTS_STRIP_GRID_HEIGHT,
  }),
  // Allow the panel to shrink to a single grid row when hugging content.
  layoutConstraints: {
    minHeight: 1,
  },
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const { core } = getAiInsightsServices();
    // Prefer our in-panel header; hide dashboard chrome title, keep panel border.
    const titleManager = initializeTitleManager({
      ...initialState,
      hide_title: initialState.hide_title ?? true,
      hide_border: initialState.hide_border ?? false,
      title:
        initialState.title ??
        i18n.translate('xpack.agentBuilderDashboards.aiInsights.defaultTitle', {
          defaultMessage: 'AI Insights',
        }),
    });
    const connectorId$ = new BehaviorSubject(initialState.connector_id ?? '');
    const generationMode$ = new BehaviorSubject<AiInsightsGenerationMode>(
      initialState.generation_mode ?? AI_INSIGHTS_GENERATION_MODE.on_demand
    );
    const refreshMode$ = new BehaviorSubject<AiInsightsRefreshMode>(
      initialState.refresh_mode ?? AI_INSIGHTS_REFRESH_MODE.manual
    );
    const heightMode$ = new BehaviorSubject<AiInsightsHeightMode>(
      initialState.height_mode ?? AI_INSIGHTS_HEIGHT_MODE.auto
    );
    const isCollapsed$ = new BehaviorSubject(Boolean(initialState.is_collapsed));
    const expandedGridH$ = new BehaviorSubject(
      initialState.expanded_grid_h ?? AI_INSIGHTS_DEFAULT_GRID_HEIGHT
    );
    const dataLoading$ = new BehaviorSubject<boolean | undefined>(false);
    const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
    const insight$ = new BehaviorSubject<AiInsightsResult | undefined>(undefined);
    const isStale$ = new BehaviorSubject(false);
    const connectors$ = new BehaviorSubject<AIConnector[]>([]);
    const connectorsLoading$ = new BehaviorSubject(true);
    const latestFetchContext$ = new BehaviorSubject<FetchContext | undefined>(undefined);
    const lastFetchedFingerprint$ = new BehaviorSubject<string | undefined>(undefined);
    /** Bumped only by Generate / Update clicks. */
    const manualTrigger$ = new BehaviorSubject(0);

    const stateApi = initializeStateApi<AiInsightsEmbeddableState>({
      uuid,
      parentApi,
      serializeState: (): AiInsightsEmbeddableState => ({
        ...titleManager.getLatestState(),
        connector_id: connectorId$.getValue(),
        generation_mode: generationMode$.getValue(),
        refresh_mode: refreshMode$.getValue(),
        height_mode: heightMode$.getValue(),
        is_collapsed: isCollapsed$.getValue(),
        expanded_grid_h: expandedGridH$.getValue(),
      }),
      anyStateChange$: merge(
        titleManager.anyStateChange$,
        connectorId$.pipe(
          skip(1),
          map(() => undefined)
        ),
        generationMode$.pipe(
          skip(1),
          map(() => undefined)
        ),
        refreshMode$.pipe(
          skip(1),
          map(() => undefined)
        ),
        heightMode$.pipe(
          skip(1),
          map(() => undefined)
        ),
        isCollapsed$.pipe(
          skip(1),
          map(() => undefined)
        ),
        expandedGridH$.pipe(
          skip(1),
          map(() => undefined)
        )
      ),
      getComparators: () => ({
        ...titleComparators,
        connector_id: 'referenceEquality',
        generation_mode: 'referenceEquality',
        refresh_mode: 'referenceEquality',
        height_mode: 'referenceEquality',
        is_collapsed: 'referenceEquality',
        expanded_grid_h: 'referenceEquality',
      }),
      applySerializedState: (nextState) => {
        titleManager.reinitializeState({
          ...nextState,
          hide_title: nextState?.hide_title ?? true,
          hide_border: nextState?.hide_border ?? false,
        });
        connectorId$.next(nextState?.connector_id ?? '');
        generationMode$.next(
          nextState?.generation_mode ?? AI_INSIGHTS_GENERATION_MODE.on_demand
        );
        refreshMode$.next(nextState?.refresh_mode ?? AI_INSIGHTS_REFRESH_MODE.manual);
        heightMode$.next(nextState?.height_mode ?? AI_INSIGHTS_HEIGHT_MODE.auto);
        isCollapsed$.next(Boolean(nextState?.is_collapsed));
        expandedGridH$.next(nextState?.expanded_grid_h ?? AI_INSIGHTS_DEFAULT_GRID_HEIGHT);
      },
    });

    const toggleCollapsed = () => {
      // Do not collapse while insights are generating.
      if (dataLoading$.getValue()) {
        return;
      }
      const nextCollapsed = !isCollapsed$.getValue();
      if (!nextCollapsed) {
        // Grow immediately on expand so content isn't measured inside a clipped cell.
        setAiInsightsPanelGridHeight(parentApi, uuid, expandedGridH$.getValue());
      } else {
        // Remember the current size so fixed-height panels restore after expand.
        const currentHeight = getAiInsightsPanelGridHeight(parentApi, uuid);
        if (currentHeight && currentHeight > AI_INSIGHTS_COLLAPSED_MAX_GRID_HEIGHT) {
          expandedGridH$.next(currentHeight);
        }
        // Shrink immediately on collapse; ResizeObserver will refine to exact content height.
        setAiInsightsPanelGridHeight(parentApi, uuid, AI_INSIGHTS_COLLAPSED_GRID_HEIGHT);
      }
      isCollapsed$.next(nextCollapsed);
    };

    const navigateToModelSettings = () => {
      void core.application.navigateToApp('management', {
        path: 'modelManagement/model_settings',
      });
    };

    const openSettings = async ({ returnFocus }: { returnFocus?: () => void } = {}) => {
      openLazyFlyout({
        core,
        parentApi,
        returnFocus,
        loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
          const { ConnectorSettingsFlyout } = await import('./connector_settings_flyout');
          return (
            <ConnectorSettingsFlyout
              ariaLabelledBy={ariaLabelledBy}
              connectors={connectors$.getValue()}
              selectedConnectorId={
                connectorId$.getValue() || pickDefaultConnector(connectors$.getValue())?.id || ''
              }
              generationMode={generationMode$.getValue()}
              refreshMode={refreshMode$.getValue()}
              heightMode={heightMode$.getValue()}
              onClose={closeFlyout}
              onManageConnectors={() => {
                closeFlyout();
                navigateToModelSettings();
              }}
              onSave={({ connectorId, generationMode, refreshMode, heightMode }) => {
                connectorId$.next(connectorId);
                generationMode$.next(generationMode);
                refreshMode$.next(refreshMode);
                heightMode$.next(heightMode);
                closeFlyout();
              }}
            />
          );
        },
      });
    };

    const api = finalizeApi({
      ...stateApi,
      ...titleManager.api,
      dataLoading$,
      blockingError$,
      getTypeDisplayName: () =>
        i18n.translate('xpack.agentBuilderDashboards.aiInsights.typeDisplayName', {
          defaultMessage: 'AI insights',
        }),
      isEditingEnabled: () => true,
      onEdit: async ({ returnFocus } = {}) => {
        await openSettings({ returnFocus });
      },
    });

    void loadConnectors({
      http: core.http,
      featureId: AI_INSIGHTS_CONNECTOR_FEATURE_ID,
    })
      .then((connectors) => {
        connectors$.next(connectors);
        if (!connectorId$.getValue()) {
          const defaultConnector = pickDefaultConnector(connectors);
          if (defaultConnector) {
            connectorId$.next(defaultConnector.id);
          }
        }
      })
      .catch((error) => {
        blockingError$.next(error instanceof Error ? error : new Error(String(error)));
      })
      .finally(() => {
        connectorsLoading$.next(false);
      });

    let previousAbort: AbortController | undefined;
    let lastHandledTrigger = 0;

    // Same fetch pipeline as before settings — options only gate whether we run it.
    const fetchSubscription = combineLatest([
      fetch$(api),
      connectorId$,
      manualTrigger$,
      generationMode$,
      refreshMode$,
    ])
      .pipe(
        tap(() => {
          previousAbort?.abort();
        }),
        switchMap(([fetchContext, connectorId, trigger, generationMode, refreshMode]) => {
          latestFetchContext$.next(fetchContext);

          const fingerprint = getAiInsightsContextFingerprint(fetchContext);
          const lastFingerprint = lastFetchedFingerprint$.getValue();
          const hasInsight = Boolean(insight$.getValue());
          const isManualTrigger = trigger !== lastHandledTrigger;
          lastHandledTrigger = trigger;

          if (
            hasInsight &&
            lastFingerprint &&
            fingerprint !== lastFingerprint &&
            refreshMode === AI_INSIGHTS_REFRESH_MODE.manual
          ) {
            isStale$.next(true);
          }

          if (!connectorId) {
            insight$.next(undefined);
            dataLoading$.next(false);
            return of(undefined);
          }

          if (!hasInsight) {
            if (generationMode === AI_INSIGHTS_GENERATION_MODE.on_demand && !isManualTrigger) {
              dataLoading$.next(false);
              return of(undefined);
            }
          } else if (refreshMode === AI_INSIGHTS_REFRESH_MODE.manual && !isManualTrigger) {
            dataLoading$.next(false);
            return of(undefined);
          } else if (
            refreshMode === AI_INSIGHTS_REFRESH_MODE.auto &&
            fingerprint === lastFingerprint &&
            !isManualTrigger
          ) {
            // Mode toggles alone should not refetch identical context.
            dataLoading$.next(false);
            return of(undefined);
          }

          const controller = new AbortController();
          previousAbort = controller;
          dataLoading$.next(true);
          blockingError$.next(undefined);
          isStale$.next(false);

          const timeRange = fetchContext.timeRange ?? { from: 'now-15m', to: 'now' };
          const searchQuery =
            fetchContext.query &&
            'language' in fetchContext.query &&
            typeof fetchContext.query.language === 'string'
              ? {
                  language: fetchContext.query.language,
                  query:
                    typeof fetchContext.query.query === 'string'
                      ? fetchContext.query.query
                      : JSON.stringify(fetchContext.query.query ?? ''),
                }
              : undefined;
          const body = {
            connector_id: connectorId,
            dashboard: buildDashboardContext(parentApi, uuid),
            time_range: {
              from: timeRange.from,
              to: timeRange.to,
            },
            query: summarizeQuery(fetchContext.query),
            search_query: searchQuery,
            filters: fetchContext.filters ?? [],
            filters_summary: summarizeFilters(fetchContext.filters),
          };

          return from(
            core.http.post<AiInsightsResult>(AI_INSIGHTS_API_PATH, {
              body: JSON.stringify(body),
              version: '1',
              signal: controller.signal,
            })
          ).pipe(
            tap((result) => {
              insight$.next(result);
              lastFetchedFingerprint$.next(fingerprint);
              isStale$.next(false);
            }),
            catchError((error) => {
              if (error?.name !== 'AbortError') {
                blockingError$.next(error instanceof Error ? error : new Error(String(error)));
              }
              return of(undefined);
            }),
            finalize(() => {
              dataLoading$.next(false);
            })
          );
        })
      )
      .subscribe();

    const requestGenerate = () => {
      manualTrigger$.next(manualTrigger$.getValue() + 1);
    };

    return {
      api,
      Component: () => {
        const [
          insight,
          isLoading,
          connectors,
          isConnectorsLoading,
          connectorId,
          generationMode,
          heightMode,
          isStale,
          isCollapsed,
        ] = useBatchedPublishingSubjects(
          insight$,
          dataLoading$,
          connectors$,
          connectorsLoading$,
          connectorId$,
          generationMode$,
          heightMode$,
          isStale$,
          isCollapsed$
        );

        const hasConnectors = connectors.length > 0;
        const hasSelectedConnector = Boolean(connectorId);
        const isStrip =
          !isConnectorsLoading &&
          !isLoading &&
          !insight &&
          (!hasConnectors ||
            !hasSelectedConnector ||
            generationMode === AI_INSIGHTS_GENERATION_MODE.on_demand);
        const hugContent =
          heightMode === AI_INSIGHTS_HEIGHT_MODE.auto || isCollapsed || isStrip;

        // Ensure strip states (empty / on-demand CTA) never sit below the strip floor.
        useEffect(() => {
          if (isStrip) {
            const current = getAiInsightsPanelGridHeight(parentApi, uuid);
            if (current !== undefined && current < AI_INSIGHTS_STRIP_GRID_HEIGHT) {
              setAiInsightsPanelGridHeight(parentApi, uuid, AI_INSIGHTS_STRIP_GRID_HEIGHT);
            }
          }
        }, [isStrip]);

        // Stay expanded while generating — collapsing mid-load is not useful.
        useEffect(() => {
          if (isLoading && isCollapsed) {
            setAiInsightsPanelGridHeight(parentApi, uuid, expandedGridH$.getValue());
            isCollapsed$.next(false);
          }
        }, [isLoading, isCollapsed]);

        const onContentHeightChange = useCallback(
          (heightPx: number) => {
            if (!hugContent) {
              return;
            }
            let targetHeight = contentHeightToGridRows(heightPx);
            // Compact modes must not re-inflate from a stale tall grid cell.
            if (isCollapsed) {
              targetHeight = Math.min(targetHeight, AI_INSIGHTS_COLLAPSED_MAX_GRID_HEIGHT);
            } else if (isStrip) {
              // Match loading-state height so the empty CTA strip doesn't feel cramped.
              targetHeight = Math.min(
                Math.max(targetHeight, AI_INSIGHTS_STRIP_GRID_HEIGHT),
                AI_INSIGHTS_STRIP_MAX_GRID_HEIGHT
              );
            } else {
              // Always remember + apply measured height so the panel shrinks after load.
              expandedGridH$.next(targetHeight);
            }
            setAiInsightsPanelGridHeight(parentApi, uuid, targetHeight);
          },
          [hugContent, isCollapsed, isStrip]
        );

        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              minHeight: 0,
              boxSizing: 'border-box',
              padding: 0,
            }}
          >
            <AiInsightsPanel
              insight={insight}
              isLoading={Boolean(isLoading)}
              hasConnectors={hasConnectors}
              hasSelectedConnector={hasSelectedConnector}
              isConnectorsLoading={isConnectorsLoading}
              generationMode={generationMode}
              heightMode={heightMode}
              isStale={isStale}
              isExpanded={!isCollapsed}
              onToggleExpanded={toggleCollapsed}
              onContentHeightChange={onContentHeightChange}
              onSetupConnector={navigateToModelSettings}
              onOpenSettings={() => {
                void openSettings();
              }}
              onGenerate={requestGenerate}
              onUpdate={requestGenerate}
            />
          </div>
        );
      },
      tearDown: () => {
        fetchSubscription.unsubscribe();
        previousAbort?.abort();
      },
    };
  },
};

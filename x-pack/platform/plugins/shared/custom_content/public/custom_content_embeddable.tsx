/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DefaultEmbeddableApi,
  EmbeddablePublicDefinition,
} from '@kbn/embeddable-plugin/public';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { HasInspectorAdapters } from '@kbn/inspector-plugin/public';
import type {
  HasTypeDisplayName,
  HasEditCapabilities,
  PublishesDataSources,
  PublishesDataLoading,
  PublishesEsql,
  PublishesWritableTimeRange,
  ViewMode,
} from '@kbn/presentation-publishing';
import {
  initializeTitleManager,
  titleComparators,
  initializeTimeRangeManager,
  timeRangeComparators,
  initializeStateApi,
  useBatchedPublishingSubjects,
  apiPublishesReload,
  apiPublishesTimeRange,
  apiIsPresentationContainer,
  fetch$,
  getViewModeSubject,
} from '@kbn/presentation-publishing';
import { openLazyFlyout, tracksOverlays } from '@kbn/presentation-util';
import { i18n } from '@kbn/i18n';
import type { AggregateQuery, Filter, Query, TimeRange, ProjectRouting } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import React, { useCallback, useEffect, useState } from 'react';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  EMPTY,
  finalize,
  from,
  map,
  merge,
  of,
  skip,
  switchMap,
} from 'rxjs';
import {
  isExecutionTerminalEvent,
  isToolCallEvent,
  isToolUiEvent,
  type ToolUiEvent,
} from '@kbn/agent-builder-common';
import type { BrowserChatEvent } from '@kbn/agent-builder-browser';
import {
  CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  CUSTOM_CONTENT_GENERATE_DASHBOARD_TOOL_ID,
  CUSTOM_CONTENT_UPDATE_PANEL_TOOL_ID,
} from '@kbn/custom-content-common';
import {
  CustomContentComponent,
  type CustomContentRendererServices,
} from '@kbn/custom-content-renderer';
import type { DataView } from '@kbn/data-views-plugin/common';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import { css } from '@emotion/react';
import { getServices } from './services';
import { readContextQueries } from '../common/panel_context_queries';
import { getTelemetry } from './telemetry';
import { MAX_PREVIEW_HEIGHT } from '../common/panel_context_attachment';
import {
  CUSTOM_CONTENT_UPDATED_UI_EVENT,
  type CustomContentUpdatedUiEventData,
} from '../common/ui_events';
import {
  buildCustomContentContextAttachment,
  type CustomContentFetchContext,
} from './utils/chat_integration';
import { registerPanelPreviewHandler } from './utils/panel_preview_registry';
import type { CustomContentEmbeddableState } from '../server';

const isToolCallForPanel = (event: BrowserChatEvent, panelId: string): boolean => {
  if (!isToolCallEvent(event)) return false;
  const { tool_id: toolId, params } = event.data;
  if (toolId === CUSTOM_CONTENT_UPDATE_PANEL_TOOL_ID) return params.embeddable_id === panelId;
  if (toolId !== CUSTOM_CONTENT_GENERATE_DASHBOARD_TOOL_ID || !Array.isArray(params.panels))
    return false;
  return params.panels.some(
    (panel: unknown) =>
      typeof panel === 'object' && panel !== null && 'id' in panel && panel.id === panelId
  );
};

const isCustomContentUpdatedUiEvent = (
  event: BrowserChatEvent
): event is ToolUiEvent<typeof CUSTOM_CONTENT_UPDATED_UI_EVENT, CustomContentUpdatedUiEventData> =>
  isToolUiEvent(event, CUSTOM_CONTENT_UPDATED_UI_EVENT);

const panelMeasureCss = css({
  display: 'flex',
  flexDirection: 'column',
  flex: '1 1 100%',
  minHeight: 0,
});

export type CustomContentApi = DefaultEmbeddableApi<CustomContentEmbeddableState> &
  HasTypeDisplayName &
  HasEditCapabilities &
  PublishesDataSources<DataView> &
  PublishesDataLoading &
  PublishesEsql &
  PublishesWritableTimeRange &
  HasInspectorAdapters;

export const customContentEmbeddableFactory: EmbeddablePublicDefinition<
  CustomContentEmbeddableState,
  CustomContentApi
> = {
  type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const { core, search, dataViews, agentBuilder } = getServices();
    const rendererServices: CustomContentRendererServices = {
      http: core.http,
      uiSettings: core.uiSettings,
      search,
    };
    // The panel's own container is outside the sandboxed iframe, so its height is readable.
    // Captured when the panel is sent to chat so the preview there starts at the size the
    // user was actually looking at.
    const panelElement: { current: HTMLDivElement | null } = { current: null };
    const currentFetchContext = (): CustomContentFetchContext => ({
      timeRange: effectiveTimeRange$.getValue(),
      esqlVariables: esqlVariables$.getValue(),
      filters: filters$.getValue(),
      query: query$.getValue(),
      isApproximate: isApproximate$.getValue(),
      projectRouting: projectRouting$.getValue(),
    });
    const measurePanelHeight = () => {
      const measured = panelElement.current?.getBoundingClientRect().height;
      return measured ? Math.min(MAX_PREVIEW_HEIGHT, Math.round(measured)) : undefined;
    };
    const titleManager = initializeTitleManager(initialState);
    const timeRangeManager = initializeTimeRangeManager(initialState);
    let isRetained = false;
    // The other queries extend the first, so a panel with no first query, or an empty one, has none.
    const keepIfMainQuery = (queries: readonly string[]): string[] =>
      queries[0] ? [...queries] : [];
    // The panel's queries, the first of which is `rows` in its template. Only a hand-edited panel has
    // more than one, and the editor changes only the first.
    const esqlQueries$ = new BehaviorSubject<string[]>(
      keepIfMainQuery(initialState.esql_query ?? [])
    );
    // Sets the queries only when they change, so an update that leaves them as they are neither fires
    // a state change nor hands subscribers a new list.
    const setEsqlQueries = (queries: readonly string[]) => {
      const next = keepIfMainQuery(queries);
      const current = esqlQueries$.getValue();
      const isSame =
        current.length === next.length && current.every((query, index) => query === next[index]);
      if (!isSame) esqlQueries$.next(next);
    };
    const replaceMainQuery = (queries: readonly string[], mainQuery: string | undefined) =>
      mainQuery ? [mainQuery, ...queries.slice(1)] : [];
    const template$ = new BehaviorSubject<string | undefined>(initialState.template);
    const requestAdapter = new RequestAdapter();
    const previewHtml$ = new BehaviorSubject<string | null>(null);
    const isGenerating$ = new BehaviorSubject<boolean>(false);
    const createChatGeneratingCallbacks = () => {
      let hasSubmitted = false;
      return {
        onSubmit: () => {
          if (hasSubmitted) return;
          hasSubmitted = true;
          isGenerating$.next(true);
        },
        onClose: () => {
          if (isGenerating$.getValue()) isGenerating$.next(false);
        },
      };
    };
    const esql$ = new BehaviorSubject<AggregateQuery[]>([]);
    const approximationApplied$ = new BehaviorSubject<boolean | undefined>(undefined);
    const isApproximate$ = new BehaviorSubject<boolean>(false);
    const projectRouting$ = new BehaviorSubject<ProjectRouting | undefined>(undefined);
    const query$ = new BehaviorSubject<Query | AggregateQuery | undefined>(undefined);
    const filters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
    const esqlVariables$ = new BehaviorSubject<ESQLControlVariable[] | undefined>(undefined);
    // The range the panel actually renders with: fetch$ resolves the panel's own override over the
    // dashboard's. Seeded from the parent for the first render.
    const effectiveTimeRange$ = new BehaviorSubject<TimeRange | undefined>(
      timeRangeManager.api.timeRange$.getValue() ??
        (apiPublishesTimeRange(parentApi)
          ? parentApi.timeRange$.getValue() ?? undefined
          : undefined)
    );
    const dataSources$ = new BehaviorSubject<DataView[] | undefined>(undefined);
    // Starts true so the panel is not reported as render-complete before its first fetch resolves;
    // screenshotting would otherwise capture an empty panel.
    const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);

    const serializeState = (): CustomContentEmbeddableState => ({
      ...titleManager.getLatestState(),
      ...timeRangeManager.getLatestState(),
      esql_query: esqlQueries$.getValue().length ? [...esqlQueries$.getValue()] : undefined,
      template: template$.getValue(),
    });

    const applyAttachmentData = (
      data: Parameters<typeof readContextQueries>[0] & {
        panel_template: string;
      }
    ) => {
      template$.next(data.panel_template);
      setEsqlQueries(readContextQueries(data));
    };

    const applyConfigUpdate = (update: { esqlQuery?: string; template?: string }) => {
      if ('esqlQuery' in update) {
        setEsqlQueries(replaceMainQuery(esqlQueries$.getValue(), update.esqlQuery));
      }
      if ('template' in update) template$.next(update.template);
    };

    const stateApi = initializeStateApi<CustomContentEmbeddableState>({
      uuid,
      parentApi,
      serializeState,
      anyStateChange$: merge(
        titleManager.anyStateChange$,
        timeRangeManager.anyStateChange$,
        esqlQueries$.pipe(
          skip(1),
          map(() => undefined)
        ),
        template$.pipe(
          skip(1),
          map(() => undefined)
        )
      ),
      getComparators: () => ({
        ...titleComparators,
        ...timeRangeComparators,
        esql_query: 'deepEquality',
        template: 'referenceEquality',
      }),
      applySerializedState: (lastSaved) => {
        titleManager.reinitializeState(lastSaved ?? {});
        timeRangeManager.reinitializeState(lastSaved ?? {});
        setEsqlQueries(lastSaved?.esql_query ?? []);
        template$.next(lastSaved?.template);
      },
    });

    const api = finalizeApi({
      ...stateApi,
      ...titleManager.api,
      ...timeRangeManager.api,
      serializeState,
      esql$,
      approximationApplied$,
      dataSources$,
      dataLoading$,
      // A static panel makes no request, so it offers no Inspect entry.
      getInspectorAdapters: () =>
        esqlQueries$.getValue().length ? { requests: requestAdapter } : undefined,
      getTypeDisplayName: () =>
        i18n.translate('xpack.customContent.embeddable.typeDisplayName', {
          defaultMessage: 'Custom panel',
        }),
      onEdit: async ({ isNewPanel = false, returnFocus } = {}) => {
        getTelemetry().trackEditFlyoutOpened({
          isNewPanel,
          hasTemplate: Boolean(template$.getValue()),
          hasEsqlQuery: esqlQueries$.getValue().length > 0,
        });
        let hasSaved = false;
        const flyoutRef = openLazyFlyout({
          core,
          parentApi,
          returnFocus,
          loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
            const { EditCustomContentFlyout } = await import(
              './components/edit_custom_content_flyout'
            );

            const handleSave = (
              newEsqlQuery: string | undefined,
              newTemplate: string | undefined
            ) => {
              hasSaved = true;
              applyConfigUpdate({ esqlQuery: newEsqlQuery, template: newTemplate });
              closeFlyout();
            };

            const handleClose = () => {
              closeFlyout();
            };

            const handleGenerateWithChatFromFlyout = (
              draftTemplate: string,
              draftEsqlQuery: string | undefined
            ) => {
              if (!agentBuilder) return;
              hasSaved = true;
              closeFlyout();
              agentBuilder.openChat({
                newConversation: true,
                ...createChatGeneratingCallbacks(),
                attachments: [
                  buildCustomContentContextAttachment({
                    template: draftTemplate,
                    // The editor does not change the other queries yet, so the chat gets the panel's own.
                    esqlQueries: replaceMainQuery(esqlQueries$.getValue(), draftEsqlQuery),
                    embeddableId: uuid,
                    panelTitle: titleManager.api.title$.getValue() ?? undefined,
                    panelHeight: measurePanelHeight(),
                    fetchContext: currentFetchContext(),
                  }),
                ],
              });
            };

            function FlyoutWithReactiveState() {
              const [timeRange, setTimeRange] = useState(effectiveTimeRange$.getValue());
              const [isApproximate, setIsApproximate] = useState(isApproximate$.getValue());
              const [projectRouting, setProjectRouting] = useState(projectRouting$.getValue());
              const [query, setQuery] = useState(query$.getValue());
              const [filters, setFilters] = useState(filters$.getValue());
              const [esqlVariablesFlyout, setEsqlVariablesFlyout] = useState(
                esqlVariables$.getValue()
              );

              useEffect(() => {
                const subs = [
                  effectiveTimeRange$.subscribe(setTimeRange),
                  isApproximate$.subscribe(setIsApproximate),
                  projectRouting$.subscribe(setProjectRouting),
                  query$.subscribe(setQuery),
                  filters$.subscribe(setFilters),
                  esqlVariables$.subscribe(setEsqlVariablesFlyout),
                ];
                return () => subs.forEach((s) => s.unsubscribe());
              }, []);

              return (
                <EditCustomContentFlyout
                  esqlQueries={esqlQueries$.getValue()}
                  template={template$.getValue()}
                  timeRange={timeRange}
                  isApproximate={isApproximate}
                  projectRouting={projectRouting}
                  query={query}
                  filters={filters}
                  esqlVariables={esqlVariablesFlyout}
                  isNewPanel={isNewPanel}
                  ariaLabelledBy={ariaLabelledBy}
                  onSave={handleSave}
                  onClose={handleClose}
                  onRunPreview={(html) => previewHtml$.next(html)}
                  onGenerateWithChat={handleGenerateWithChatFromFlyout}
                />
              );
            }

            return <FlyoutWithReactiveState />;
          },
          flyoutProps: {
            focusedPanelId: uuid,
            size: 600,
            minWidth: 320,
          },
        });
        flyoutRef.onClose.then(() => {
          const panelRemoved =
            !hasSaved && !isRetained && isNewPanel && apiIsPresentationContainer(parentApi);
          if (!hasSaved) {
            getTelemetry().trackEditCancelled({
              isNewPanel,
              panelRemoved,
            });
          }
          if (panelRemoved) {
            parentApi.removePanel(uuid);
          }
          isRetained = false;
          previewHtml$.next(null);
        });
      },
      isEditingEnabled: () => true,
    });

    // Lets an ES|QL control find the panels whose queries use its variable, whichever query that is.
    const esqlUsageSubscription = esqlQueries$
      .pipe(map((queries) => queries.map((query) => ({ esql: query }))))
      .subscribe(esql$);

    // Important for unified search support: KQL bar and filter builder suggestions, and whether the
    // dashboard offers its time picker. Every query counts, since every query is fetched with the
    // dashboard's time range, so a data view is published for each one.
    const dataViewsSubscription = combineLatest([esqlQueries$, projectRouting$])
      .pipe(
        map(([queries, routingValue]) => ({ queries, routingValue })),
        distinctUntilChanged(
          (a, b) => a.routingValue === b.routingValue && a.queries === b.queries
        ),
        switchMap(({ queries, routingValue }) => {
          if (queries.length === 0) return of(undefined);
          return from(
            Promise.all(
              queries.map(async (query) => {
                // One query that cannot be resolved must not hide the data views of the others, or
                // end the subscription.
                try {
                  return await getESQLAdHocDataview({
                    dataViewsService: dataViews,
                    query,
                    http: core.http,
                    projectRouting: routingValue,
                  });
                } catch {
                  return undefined;
                }
              })
            )
          );
        })
      )
      .subscribe((resolved) => {
        // Queries that resolve to the same data view publish it once. The identity is the whole
        // ad-hoc data view (index pattern, project routing and time field), not just the index:
        // two queries on one index can resolve different time fields, and the one that has a time
        // field is what makes the dashboard offer its time picker.
        const byIdentity = new Map<string, DataView>();
        (resolved ?? []).forEach((dataView) => {
          if (!dataView) return;
          const identity =
            dataView.id ?? `${dataView.getIndexPattern()}|${dataView.timeFieldName ?? ''}`;
          if (!byIdentity.has(identity)) byIdentity.set(identity, dataView);
        });
        dataSources$.next(byIdentity.size ? Array.from(byIdentity.values()) : undefined);
      });

    const fetchSubscription = fetch$(api).subscribe((ctx) => {
      isApproximate$.next(ctx.isApproximate);
      projectRouting$.next(ctx.projectRouting);
      query$.next(ctx.query);
      filters$.next(ctx.filters);
      esqlVariables$.next(ctx.esqlVariables);
      effectiveTimeRange$.next(ctx.timeRange);
      if (!ctx.isReload) {
        previewHtml$.next(null);
      }
    });

    const viewMode$ = getViewModeSubject(api) ?? new BehaviorSubject<ViewMode>('edit');

    return {
      api,
      Component: function CustomContentEmbeddableComponent() {
        const [
          esqlQueries,
          savedTemplate,
          panelTitle,
          isApproximate,
          projectRouting,
          query,
          filters,
          esqlVariables,
          previewHtml,
          timeRange,
          isGenerating,
          viewMode,
        ] = useBatchedPublishingSubjects(
          esqlQueries$,
          template$,
          titleManager.api.title$,
          isApproximate$,
          projectRouting$,
          query$,
          filters$,
          esqlVariables$,
          previewHtml$,
          effectiveTimeRange$,
          isGenerating$,
          viewMode$
        );
        const [generationVersion, setGenerationVersion] = useState(0);

        useEffect(() => {
          return () => {
            esqlUsageSubscription.unsubscribe();
            dataViewsSubscription.unsubscribe();
            fetchSubscription.unsubscribe();
          };
        }, []);

        useEffect(() => {
          if (!apiPublishesReload(parentApi)) return;
          const sub = parentApi.reload$.subscribe(() => setGenerationVersion((v) => v + 1));
          return () => sub.unsubscribe();
        }, []);

        useEffect(() => registerPanelPreviewHandler(uuid, applyAttachmentData), []);

        useEffect(() => {
          if (!agentBuilder) return;

          const sub = agentBuilder.events.ui.activeConversation$
            .pipe(
              distinctUntilChanged((a, b) => a?.id === b?.id),
              switchMap((conversation) =>
                conversation?.id
                  ? agentBuilder.events.getChatEvents$(conversation.id).pipe(
                      catchError(() => {
                        isGenerating$.next(false);
                        return EMPTY;
                      }),
                      finalize(() => {
                        if (isGenerating$.getValue()) isGenerating$.next(false);
                      })
                    )
                  : EMPTY
              )
            )
            .subscribe((event) => {
              if (isExecutionTerminalEvent(event)) {
                if (isGenerating$.getValue()) isGenerating$.next(false);
                return;
              }

              if (isToolCallForPanel(event, uuid)) {
                isGenerating$.next(true);
                return;
              }

              if (!isCustomContentUpdatedUiEvent(event)) return;

              const {
                data: { data },
              } = event.data;
              if (data.embeddable_id !== uuid) return;

              applyAttachmentData(data);
              if (isGenerating$.getValue()) isGenerating$.next(false);
              getTelemetry().trackAgentUpdateApplied({
                hasEsqlQuery: Boolean(data.esql_query),
                templateSizeBytes: data.panel_template.length,
              });
            });

          return () => sub.unsubscribe();
        }, []);

        const handleLoadingChange = useCallback((isLoading: boolean) => {
          dataLoading$.next(isLoading);
        }, []);

        const setApproximationApplied = useCallback((value: boolean | undefined) => {
          if (approximationApplied$.getValue() !== value) {
            approximationApplied$.next(value);
          }
        }, []);

        const handleGenerateWithChat = useCallback(() => {
          if (!agentBuilder) return;
          getTelemetry().trackGenerateWithChatClicked({
            triggerSource: 'empty_panel',
            hasExistingTemplate: false,
          });
          isRetained = true;
          if (tracksOverlays(parentApi)) parentApi.clearOverlays();
          agentBuilder.openChat({
            newConversation: true,
            ...createChatGeneratingCallbacks(),
            attachments: [
              buildCustomContentContextAttachment({
                template: '',
                embeddableId: uuid,
                panelTitle: panelTitle ?? undefined,
                panelHeight: measurePanelHeight(),
                fetchContext: currentFetchContext(),
              }),
            ],
          });
        }, [panelTitle]);

        return (
          <div
            ref={(element) => {
              panelElement.current = element;
            }}
            css={panelMeasureCss}
          >
            <CustomContentComponent
              services={rendererServices}
              embeddableId={uuid}
              esqlQueries={esqlQueries}
              timeRange={timeRange}
              generationVersion={generationVersion}
              savedTemplate={savedTemplate}
              isApproximate={isApproximate}
              projectRouting={projectRouting}
              query={query}
              filters={filters}
              esqlVariables={esqlVariables}
              previewHtml={previewHtml}
              isAiAvailable={Boolean(agentBuilder) && viewMode === 'edit'}
              isGenerating={isGenerating}
              isInteractive={viewMode !== 'non-interactive'}
              minHeight={0}
              requestAdapter={requestAdapter}
              onLoadingChange={handleLoadingChange}
              setApproximationApplied={setApproximationApplied}
              onGenerateWithChat={handleGenerateWithChat}
            />
          </div>
        );
      },
    };
  },
};

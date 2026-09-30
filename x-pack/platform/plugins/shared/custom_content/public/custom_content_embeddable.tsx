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
import type {
  HasTypeDisplayName,
  HasEditCapabilities,
  PublishesDataViews,
  PublishesDataLoading,
  PublishesEsql,
  PublishesWritableTimeRange,
} from '@kbn/presentation-publishing';
import {
  CHILDREN_UNSAVED_CHANGES_DEBOUNCE,
  UNSAVED_CHANGES_DEBOUNCE,
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
import { isExecutionTerminalEvent, isRoundStartedEvent } from '@kbn/agent-builder-common';
import { getDashboardPanelAttachmentId } from '@kbn/agent-builder-dashboards-common';
import { REFINE_WITH_CHAT_ACTION_ID } from '@kbn/dashboard-plugin/public';
import {
  CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  readEsqlQuery,
  toEsqlQueryState,
} from '@kbn/custom-content-common';
import {
  CustomContentComponent,
  type CustomContentRendererServices,
} from '@kbn/custom-content-renderer';
import type { DataView } from '@kbn/data-views-plugin/common';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import { css } from '@emotion/react';
import { getServices } from './services';
import { getTelemetry } from './telemetry';
import type { CustomContentEmbeddableState } from '../server';

/**
 * The dashboard serializes panel configs only after its unsaved-changes debounces. The shared
 * action snapshots the dashboard when it runs, so a draft applied to the panel has to land there
 * first for the attached dashboard to carry it.
 */
const DASHBOARD_STATE_SETTLE_MS = UNSAVED_CHANGES_DEBOUNCE + CHILDREN_UNSAVED_CHANGES_DEBOUNCE;

const panelLayoutCss = css({
  display: 'flex',
  flexDirection: 'column',
  flex: '1 1 100%',
  minHeight: 0,
});

export type CustomContentApi = DefaultEmbeddableApi<CustomContentEmbeddableState> &
  HasTypeDisplayName &
  HasEditCapabilities &
  PublishesDataViews &
  PublishesDataLoading &
  PublishesEsql &
  PublishesWritableTimeRange;

export const customContentEmbeddableFactory: EmbeddablePublicDefinition<
  CustomContentEmbeddableState,
  CustomContentApi
> = {
  type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const { core, search, dataViews, uiActions, agentBuilder } = getServices();
    const rendererServices: CustomContentRendererServices = {
      http: core.http,
      uiSettings: core.uiSettings,
      search,
    };
    const panelPointerId = getDashboardPanelAttachmentId(uuid);
    // Hands the panel to the shared "Refine with chat" action registered by agent_builder_dashboards.
    // It attaches the dashboard and a pointer to this panel; the agent edits the panel through the
    // dashboard and the change arrives via the dashboard live update.
    const refineWithChat = async () => {
      const action = await uiActions.getAction(REFINE_WITH_CHAT_ACTION_ID);
      await action.execute({ embeddable: api });
    };
    const titleManager = initializeTitleManager(initialState);
    const timeRangeManager = initializeTimeRangeManager(initialState);
    let isRetained = false;
    const esqlQuery$ = new BehaviorSubject<string | undefined>(readEsqlQuery(initialState));
    const template$ = new BehaviorSubject<string | undefined>(initialState.template);
    const previewHtml$ = new BehaviorSubject<string | null>(null);
    const isGenerating$ = new BehaviorSubject<boolean>(false);
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
    const dataViews$ = new BehaviorSubject<DataView[] | undefined>(undefined);
    // Starts true so the panel is not reported as render-complete before its first fetch resolves;
    // screenshotting would otherwise capture an empty panel.
    const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);

    const serializeState = (): CustomContentEmbeddableState => ({
      ...titleManager.getLatestState(),
      ...timeRangeManager.getLatestState(),
      esql_query: toEsqlQueryState(esqlQuery$.getValue()),
      template: template$.getValue(),
    });

    const applyConfigUpdate = (update: { esqlQuery?: string; template?: string }) => {
      if ('esqlQuery' in update) esqlQuery$.next(update.esqlQuery);
      if ('template' in update) template$.next(update.template);
    };

    const stateApi = initializeStateApi<CustomContentEmbeddableState>({
      uuid,
      parentApi,
      serializeState,
      anyStateChange$: merge(
        titleManager.anyStateChange$,
        timeRangeManager.anyStateChange$,
        esqlQuery$.pipe(
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
        esqlQuery$.next(lastSaved ? readEsqlQuery(lastSaved) : undefined);
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
      dataViews$,
      dataLoading$,
      getTypeDisplayName: () =>
        i18n.translate('xpack.customContent.embeddable.typeDisplayName', {
          defaultMessage: 'Custom panel',
        }),
      onEdit: async ({ isNewPanel = false, returnFocus } = {}) => {
        getTelemetry().trackEditFlyoutOpened({
          isNewPanel,
          hasTemplate: Boolean(template$.getValue()),
          hasEsqlQuery: Boolean(esqlQuery$.getValue()),
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

            // The draft becomes the panel's state first, so the dashboard attachment the action
            // sends already carries what the user was looking at in the editor.
            const handleGenerateWithChatFromFlyout = (
              draftTemplate: string,
              draftEsqlQuery: string | undefined
            ) => {
              if (!agentBuilder) return;
              hasSaved = true;
              applyConfigUpdate({
                esqlQuery: draftEsqlQuery,
                template: draftTemplate || undefined,
              });
              closeFlyout();
              setTimeout(refineWithChat, DASHBOARD_STATE_SETTLE_MS);
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
                  esqlQuery={esqlQuery$.getValue()}
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

    const esqlUsageSubscription = esqlQuery$
      .pipe(
        map((q) => (q ? [{ esql: q }] : [])),
        distinctUntilChanged((a, b) => a.length === b.length && a[0]?.esql === b[0]?.esql)
      )
      .subscribe(esql$);

    // Important for unified search support — KQL bar and filter builder suggestions.
    const dataViewsSubscription = combineLatest([esqlQuery$, projectRouting$])
      .pipe(
        distinctUntilChanged(([q1, r1], [q2, r2]) => q1 === q2 && r1 === r2),
        switchMap(([esqlQueryValue, routingValue]) => {
          if (!esqlQueryValue) return of(undefined);
          return from(
            getESQLAdHocDataview({
              dataViewsService: dataViews,
              query: esqlQueryValue,
              http: core.http,
              projectRouting: routingValue,
            })
          ).pipe(catchError(() => of(undefined)));
        })
      )
      .subscribe((dataView) => dataViews$.next(dataView ? [dataView] : undefined));

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

    return {
      api,
      Component: function CustomContentEmbeddableComponent() {
        const [
          esqlQuery,
          savedTemplate,
          isApproximate,
          projectRouting,
          query,
          filters,
          esqlVariables,
          previewHtml,
          timeRange,
          isGenerating,
        ] = useBatchedPublishingSubjects(
          esqlQuery$,
          template$,
          isApproximate$,
          projectRouting$,
          query$,
          filters$,
          esqlVariables$,
          previewHtml$,
          effectiveTimeRange$,
          isGenerating$
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
              // A round that carries this panel's pointer is refining it: show the generating state
              // until the round ends. The new template arrives through the dashboard live update.
              if (isRoundStartedEvent(event)) {
                const refersToThisPanel = event.data.input.attachment_refs?.some(
                  ({ attachment_id: attachmentId }) => attachmentId === panelPointerId
                );
                if (refersToThisPanel) isGenerating$.next(true);
                return;
              }
              if (isExecutionTerminalEvent(event) && isGenerating$.getValue()) {
                isGenerating$.next(false);
              }
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
          refineWithChat();
        }, []);

        return (
          <div css={panelLayoutCss}>
            <CustomContentComponent
              services={rendererServices}
              embeddableId={uuid}
              esqlQuery={esqlQuery}
              timeRange={timeRange}
              generationVersion={generationVersion}
              savedTemplate={savedTemplate}
              isApproximate={isApproximate}
              projectRouting={projectRouting}
              query={query}
              filters={filters}
              esqlVariables={esqlVariables}
              previewHtml={previewHtml}
              isAiAvailable={Boolean(agentBuilder)}
              isGenerating={isGenerating}
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

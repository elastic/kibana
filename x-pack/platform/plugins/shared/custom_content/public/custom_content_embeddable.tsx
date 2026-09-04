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
  PublishesEsqlUsage,
  PublishesWritableTimeRange,
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
  from,
  map,
  merge,
  of,
  skip,
  switchMap,
} from 'rxjs';
import { isRoundCompleteEvent } from '@kbn/agent-builder-common';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import {
  CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  readEsqlQuery,
  toEsqlQueryState,
} from '@kbn/custom-content-common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import { getServices } from './services';
import { getTelemetry } from './telemetry';
import { CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE } from '../common/panel_context_attachment';
import { buildCustomContentContextAttachment } from './utils/chat_integration';
import { registerPanelPreviewHandler } from './utils/panel_preview_registry';
import { readPanelContextData } from '../common/read_panel_context_data';
import type { CustomContentEmbeddableState } from '../server';
import { CustomContentComponent } from './components/custom_content_component';

export type CustomContentApi = DefaultEmbeddableApi<CustomContentEmbeddableState> &
  HasTypeDisplayName &
  HasEditCapabilities &
  PublishesDataViews &
  PublishesDataLoading &
  PublishesEsqlUsage &
  PublishesWritableTimeRange;

export const customContentEmbeddableFactory: EmbeddablePublicDefinition<
  CustomContentEmbeddableState,
  CustomContentApi
> = {
  type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const titleManager = initializeTitleManager(initialState);
    const timeRangeManager = initializeTimeRangeManager(initialState);
    let isRetained = false;
    const esqlQuery$ = new BehaviorSubject<string | undefined>(readEsqlQuery(initialState));
    const template$ = new BehaviorSubject<string | undefined>(initialState.template);
    const previewHtml$ = new BehaviorSubject<string | null>(null);
    const usesEsql$ = new BehaviorSubject<boolean>(Boolean(readEsqlQuery(initialState)));
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
      usesEsql$,
      approximationApplied$,
      dataViews$,
      dataLoading$,
      getTypeDisplayName: () =>
        i18n.translate('xpack.customContent.embeddable.typeDisplayName', {
          defaultMessage: 'Custom panel',
        }),
      onEdit: async ({ isNewPanel = false, returnFocus } = {}) => {
        const { core } = getServices();
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

            const handleGenerateWithChatFromFlyout = (
              draftTemplate: string,
              draftEsqlQuery: string | undefined
            ) => {
              const { agentBuilder } = getServices();
              if (!agentBuilder) return;
              hasSaved = true;
              closeFlyout();
              agentBuilder.openChat({
                newConversation: true,
                attachments: [
                  buildCustomContentContextAttachment(
                    draftTemplate,
                    draftEsqlQuery,
                    uuid,
                    titleManager.api.title$.getValue() ?? undefined
                  ),
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
      .pipe(map(Boolean), distinctUntilChanged())
      .subscribe((usesEsql) => usesEsql$.next(usesEsql));

    // Important for unified search support — KQL bar and filter builder suggestions.
    const dataViewsSubscription = combineLatest([esqlQuery$, projectRouting$])
      .pipe(
        distinctUntilChanged(([q1, r1], [q2, r2]) => q1 === q2 && r1 === r2),
        switchMap(([esqlQueryValue, routingValue]) => {
          if (!esqlQueryValue) return of(undefined);
          const { core, dataViews } = getServices();
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
          panelTitle,
          isApproximate,
          projectRouting,
          query,
          filters,
          esqlVariables,
          previewHtml,
          timeRange,
        ] = useBatchedPublishingSubjects(
          esqlQuery$,
          template$,
          titleManager.api.title$,
          isApproximate$,
          projectRouting$,
          query$,
          filters$,
          esqlVariables$,
          previewHtml$,
          effectiveTimeRange$
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

        useEffect(
          () =>
            registerPanelPreviewHandler(uuid, (data) => {
              template$.next(data.panel_template);
              esqlQuery$.next(data.esql_query);
            }),
          []
        );

        useEffect(() => {
          const { agentBuilder } = getServices();
          if (!agentBuilder) return;

          const sub = agentBuilder.events.ui.activeConversation$
            .pipe(
              switchMap((conversation) =>
                conversation?.id ? agentBuilder.events.getChatEvents$(conversation.id) : EMPTY
              )
            )
            .subscribe((event) => {
              if (!isRoundCompleteEvent(event)) return;

              // A round can touch several attachments — the dashboard's, and one per custom content
              // panel. Scan every agent-authored ref instead of only the first, or an unrelated
              // attachment leading the list would make this panel skip its own update.
              const agentRefs = event.data.round.input.attachment_refs?.filter(
                (ref) =>
                  ref.actor === ATTACHMENT_REF_ACTOR.agent &&
                  (ref.operation === 'updated' || ref.operation === 'created')
              );
              if (!agentRefs?.length) return;

              for (const ref of agentRefs) {
                const updatedAttachment = event.data.attachments?.find(
                  (a) =>
                    a.id === ref.attachment_id && a.type === CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE
                );
                if (!updatedAttachment) continue;

                const data = readPanelContextData(updatedAttachment);
                if (!data || data.embeddable_id !== uuid) continue;

                template$.next(data.panel_template);
                esqlQuery$.next(data.esql_query);
                getTelemetry().trackAgentUpdateApplied({
                  hasEsqlQuery: Boolean(data.esql_query),
                  templateSizeBytes: data.panel_template.length,
                });
                break;
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
          const { agentBuilder } = getServices();
          if (!agentBuilder) return;
          getTelemetry().trackGenerateWithChatClicked({
            triggerSource: 'empty_panel',
            hasExistingTemplate: false,
          });
          isRetained = true;
          if (tracksOverlays(parentApi)) parentApi.clearOverlays();
          agentBuilder.openChat({
            newConversation: true,
            attachments: [
              buildCustomContentContextAttachment('', undefined, uuid, panelTitle ?? undefined),
            ],
          });
        }, [panelTitle]);

        return (
          <CustomContentComponent
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
            onLoadingChange={handleLoadingChange}
            setApproximationApplied={setApproximationApplied}
            onGenerateWithChat={handleGenerateWithChat}
          />
        );
      },
    };
  },
};

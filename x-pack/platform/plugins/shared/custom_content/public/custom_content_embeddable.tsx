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
  PublishesEsqlUsage,
} from '@kbn/presentation-publishing';
import {
  initializeTitleManager,
  titleComparators,
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
import React, { useCallback, useEffect, useState } from 'react';
import {
  BehaviorSubject,
  catchError,
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
import { ATTACHMENT_REF_ACTOR, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import { getServices } from './services';
import {
  CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  type CustomContentContextAttachmentData,
} from '../common/panel_context_attachment';
import { buildCustomContentContextAttachment } from './utils/chat_integration';
import { CUSTOM_CONTENT_REFINE_SESSION_TAG } from '../common/constants';
import type { CustomContentEmbeddableState } from '../server';
import { CustomContentComponent } from './components/custom_content_component';

export type CustomContentApi = DefaultEmbeddableApi<CustomContentEmbeddableState> &
  HasTypeDisplayName &
  HasEditCapabilities &
  PublishesDataViews &
  PublishesEsqlUsage;

export const customContentEmbeddableFactory: EmbeddablePublicDefinition<
  CustomContentEmbeddableState,
  CustomContentApi
> = {
  type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const titleManager = initializeTitleManager(initialState);
    let isRetained = false;
    let storedPrompt = initialState.prompt ?? '';
    const esqlQuery$ = new BehaviorSubject<string | undefined>(initialState.esqlQuery);
    const template$ = new BehaviorSubject<string | undefined>(initialState.template);
    const previewHtml$ = new BehaviorSubject<string | null>(null);
    const usesEsql$ = new BehaviorSubject<boolean>(Boolean(initialState.esqlQuery));
    const isApproximate$ = new BehaviorSubject<boolean>(false);
    const projectRouting$ = new BehaviorSubject<ProjectRouting | undefined>(undefined);
    const query$ = new BehaviorSubject<Query | AggregateQuery | undefined>(undefined);
    const filters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
    const dataViews$ = new BehaviorSubject<DataView[] | undefined>(undefined);

    const serializeState = (): CustomContentEmbeddableState => ({
      ...titleManager.getLatestState(),
      prompt: storedPrompt || undefined,
      esqlQuery: esqlQuery$.getValue(),
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
        prompt: 'skip',
        esqlQuery: 'referenceEquality',
        template: 'referenceEquality',
      }),
      applySerializedState: (lastSaved) => {
        titleManager.reinitializeState(lastSaved ?? {});
        storedPrompt = lastSaved?.prompt ?? '';
        esqlQuery$.next(lastSaved?.esqlQuery);
        template$.next(lastSaved?.template);
      },
    });

    const api = finalizeApi({
      ...stateApi,
      ...titleManager.api,
      serializeState,
      usesEsql$,
      dataViews$,
      getTypeDisplayName: () =>
        i18n.translate('xpack.customContent.embeddable.typeDisplayName', {
          defaultMessage: 'Custom content',
        }),
      onEdit: async ({ isNewPanel, returnFocus } = {}) => {
        const { core } = getServices();
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
                attachments: [
                  buildCustomContentContextAttachment(
                    draftTemplate,
                    draftEsqlQuery,
                    uuid,
                    titleManager.api.title$.getValue() ?? undefined
                  ),
                ],
                sessionTag: `${CUSTOM_CONTENT_REFINE_SESSION_TAG}-${uuid}`,
              });
            };

            function FlyoutWithReactiveState() {
              const [timeRange, setTimeRange] = useState<TimeRange | undefined>(
                apiPublishesTimeRange(parentApi)
                  ? parentApi.timeRange$.getValue() ?? undefined
                  : undefined
              );
              const [isApproximate, setIsApproximate] = useState(isApproximate$.getValue());
              const [projectRouting, setProjectRouting] = useState(projectRouting$.getValue());
              const [query, setQuery] = useState(query$.getValue());
              const [filters, setFilters] = useState(filters$.getValue());

              useEffect(() => {
                const subs = [
                  ...(apiPublishesTimeRange(parentApi)
                    ? [parentApi.timeRange$.subscribe((tr) => setTimeRange(tr ?? undefined))]
                    : []),
                  isApproximate$.subscribe(setIsApproximate),
                  projectRouting$.subscribe(setProjectRouting),
                  query$.subscribe(setQuery),
                  filters$.subscribe(setFilters),
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
                  isNewPanel={isNewPanel ?? false}
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
          if (!hasSaved && !isRetained && isNewPanel && apiIsPresentationContainer(parentApi)) {
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
    const dataViewsSubscription = esqlQuery$
      .pipe(
        distinctUntilChanged(),
        switchMap((esqlQueryValue) => {
          if (!esqlQueryValue) return of(undefined);
          const { core, dataViews } = getServices();
          return from(
            getESQLAdHocDataview({
              dataViewsService: dataViews,
              query: esqlQueryValue,
              http: core.http,
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
          previewHtml,
        ] = useBatchedPublishingSubjects(
          esqlQuery$,
          template$,
          titleManager.api.title$,
          isApproximate$,
          projectRouting$,
          query$,
          filters$,
          previewHtml$
        );
        const [generationVersion, setGenerationVersion] = useState(0);
        const [timeRange, setTimeRange] = useState<TimeRange | undefined>(
          apiPublishesTimeRange(parentApi)
            ? parentApi.timeRange$.getValue() ?? undefined
            : undefined
        );

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
          if (!apiPublishesTimeRange(parentApi)) return;
          const sub = parentApi.timeRange$.subscribe((tr) => setTimeRange(tr ?? undefined));
          return () => sub.unsubscribe();
        }, []);

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

              const updatedRef = event.data.round.input.attachment_refs?.find(
                (ref) =>
                  ref.actor === ATTACHMENT_REF_ACTOR.agent &&
                  (ref.operation === 'updated' || ref.operation === 'created')
              );
              if (!updatedRef) return;

              const updatedAttachment = event.data.attachments?.find(
                (a) =>
                  a.id === updatedRef.attachment_id &&
                  a.type === CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE
              );
              if (!updatedAttachment) return;

              const data = getLatestVersion(updatedAttachment)?.data as
                | CustomContentContextAttachmentData
                | undefined;
              if (!data || data.embeddable_id !== uuid) return;

              template$.next(data.panel_template);
              esqlQuery$.next(data.esql_query);
            });

          return () => sub.unsubscribe();
        }, []);

        const handleGenerateWithChat = useCallback(() => {
          const { agentBuilder } = getServices();
          if (!agentBuilder) return;
          isRetained = true;
          if (tracksOverlays(parentApi)) parentApi.clearOverlays();
          agentBuilder.openChat({
            attachments: [
              buildCustomContentContextAttachment('', undefined, uuid, panelTitle ?? undefined),
            ],
            sessionTag: `${CUSTOM_CONTENT_REFINE_SESSION_TAG}-${uuid}`,
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
            previewHtml={previewHtml}
            onGenerateWithChat={handleGenerateWithChat}
          />
        );
      },
    };
  },
};

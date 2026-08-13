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
  fetch$,
} from '@kbn/presentation-publishing';
import { i18n } from '@kbn/i18n';
import type { AggregateQuery, Filter, Query, TimeRange, ProjectRouting } from '@kbn/es-query';
import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
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
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import { getServices } from './services';
import {
  CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  type CustomContentContextAttachmentData,
} from '../common/panel_context_attachment';
import type { CustomContentEmbeddableState } from '../server';
import { CustomContentComponent } from './components/custom_content_component';

const EditCustomContentFlyout = lazy(() =>
  import('./components/edit_custom_content_flyout').then((m) => ({
    default: m.EditCustomContentFlyout,
  }))
);

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
    const prompt$ = new BehaviorSubject<string>(initialState.prompt ?? '');
    const esqlQuery$ = new BehaviorSubject<string | undefined>(initialState.esqlQuery);
    const template$ = new BehaviorSubject<string | undefined>(initialState.template);
    const isFlyoutOpen$ = new BehaviorSubject<boolean>(false);
    const usesEsql$ = new BehaviorSubject<boolean>(Boolean(initialState.esqlQuery));
    const isApproximate$ = new BehaviorSubject<boolean>(false);
    const projectRouting$ = new BehaviorSubject<ProjectRouting | undefined>(undefined);
    const query$ = new BehaviorSubject<Query | AggregateQuery | undefined>(undefined);
    const filters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
    const dataViews$ = new BehaviorSubject<DataView[] | undefined>(undefined);

    const serializeState = (): CustomContentEmbeddableState => ({
      ...titleManager.getLatestState(),
      prompt: prompt$.getValue(),
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
        prompt$.pipe(
          skip(1),
          map(() => undefined)
        ),
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
        prompt: 'referenceEquality',
        esqlQuery: 'referenceEquality',
        template: 'referenceEquality',
      }),
      applySerializedState: (lastSaved) => {
        titleManager.reinitializeState(lastSaved ?? {});
        prompt$.next(lastSaved?.prompt ?? '');
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
      onEdit: async ({ isNewPanel } = {}) => {
        isFlyoutOpen$.next(true);
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
        switchMap((esqlQuery) => {
          if (!esqlQuery) return of(undefined);
          const { core, dataViews } = getServices();
          return from(
            getESQLAdHocDataview({ dataViewsService: dataViews, query: esqlQuery, http: core.http })
          ).pipe(catchError(() => of(undefined)));
        })
      )
      .subscribe((dataView) => dataViews$.next(dataView ? [dataView] : undefined));

    const fetchSubscription = fetch$(api).subscribe(
      ({ isApproximate, projectRouting, query, filters }) => {
        isApproximate$.next(isApproximate);
        projectRouting$.next(projectRouting);
        query$.next(query);
        filters$.next(filters);
      }
    );

    return {
      api,
      Component: function CustomContentEmbeddableComponent() {
        const [
          prompt,
          esqlQuery,
          savedTemplate,
          isFlyoutOpen,
          panelTitle,
          isApproximate,
          projectRouting,
          query,
          filters,
        ] = useBatchedPublishingSubjects(
          prompt$,
          esqlQuery$,
          template$,
          isFlyoutOpen$,
          titleManager.api.title$,
          isApproximate$,
          projectRouting$,
          query$,
          filters$
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

        const onTemplateChange = useCallback((t: string) => {
          template$.next(t);
        }, []);

        const handleFlyoutSave = useCallback(
          (newEsqlQuery: string | undefined, newTemplate: string | undefined) => {
            applyConfigUpdate({ esqlQuery: newEsqlQuery, template: newTemplate });
            setGenerationVersion((v) => v + 1);
          },
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
              setGenerationVersion((v) => v + 1);
            });

          return () => sub.unsubscribe();
        }, []);

        const handleFlyoutClose = useCallback(() => {
          isFlyoutOpen$.next(false);
        }, []);

        return (
          <>
            <CustomContentComponent
              embeddableId={uuid}
              prompt={prompt}
              esqlQuery={esqlQuery}
              timeRange={timeRange}
              generationVersion={generationVersion}
              savedTemplate={savedTemplate}
              isApproximate={isApproximate}
              projectRouting={projectRouting}
              query={query}
              filters={filters}
              onTemplateChange={onTemplateChange}
            />
            {isFlyoutOpen && (
              <Suspense fallback={null}>
                <EditCustomContentFlyout
                  embeddableId={uuid}
                  esqlQuery={esqlQuery}
                  template={savedTemplate}
                  timeRange={timeRange}
                  panelTitle={panelTitle ?? undefined}
                  onSave={handleFlyoutSave}
                  onClose={handleFlyoutClose}
                />
              </Suspense>
            )}
          </>
        );
      },
    };
  },
};

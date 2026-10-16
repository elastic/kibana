/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  BehaviorSubject,
  EMPTY,
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  merge,
  skip,
  switchMap,
} from 'rxjs';
import { i18n } from '@kbn/i18n';
import { isToolUiEvent, type ToolUiEvent } from '@kbn/agent-builder-common';
import type { BrowserChatEvent } from '@kbn/agent-builder-browser';
import { getESQLQueryVariables } from '@kbn/esql-utils';
import { openLazyFlyout } from '@kbn/presentation-util';
import type {
  DefaultEmbeddableApi,
  EmbeddablePublicDefinition,
} from '@kbn/embeddable-plugin/public';
import {
  fetch$,
  getViewModeSubject,
  initializeStateApi,
  initializeTimeRangeManager,
  initializeTitleManager,
  timeRangeComparators,
  titleComparators,
  useBatchedPublishingSubjects,
  useStateFromPublishingSubject,
  type HasEditCapabilities,
  type HasTypeDisplayName,
  type PublishesDataLoading,
  type PublishesWritableTimeRange,
} from '@kbn/presentation-publishing';
import {
  CUSTOM_APP_EMBEDDABLE_TYPE,
  CUSTOM_APP_STATE_VERSION,
  appDocumentSchema,
  collectQueries,
  isEmptyDocument,
  type AppDocument,
} from '@kbn/custom-app-common';
import type { CustomAppEmbeddableState } from '../server';
import { AppFrame } from './components/app_frame';
import { EmptyApp } from './components/empty_app';
import { NodeRenderer } from './components/node_renderer';
import { createDataLayer } from './data/data_layer';
import { DataLayerContext } from './data/data_layer_context';
import { CUSTOM_APP_UPDATED_UI_EVENT, type CustomAppUpdatedUiEventData } from '../common/ui_events';
import type { HasCustomAppDocument } from './has_custom_app_document';
import { createAppRuntime } from './runtime/app_runtime';
import { AppRuntimeContext } from './runtime/app_runtime_context';
import { createRunEsqlQuery } from './data/run_esql_query';
import { createDefaultDocument } from './default_document';
import { getServices } from './services';
import { buildCustomAppContextAttachment } from './utils/chat_integration';

const isCustomAppUpdatedUiEvent = (
  event: BrowserChatEvent
): event is ToolUiEvent<typeof CUSTOM_APP_UPDATED_UI_EVENT, CustomAppUpdatedUiEventData> =>
  isToolUiEvent(event, CUSTOM_APP_UPDATED_UI_EVENT);

export type CustomAppApi = DefaultEmbeddableApi<CustomAppEmbeddableState> &
  HasTypeDisplayName &
  HasEditCapabilities &
  HasCustomAppDocument &
  PublishesDataLoading &
  PublishesWritableTimeRange;

export const customAppEmbeddableFactory: EmbeddablePublicDefinition<
  CustomAppEmbeddableState,
  CustomAppApi
> = {
  type: CUSTOM_APP_EMBEDDABLE_TYPE,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const { core, search, agentBuilder } = getServices();
    const titleManager = initializeTitleManager(initialState);
    const timeRangeManager = initializeTimeRangeManager(initialState);
    const document$ = new BehaviorSubject<AppDocument>(initialState.document);

    // What the editor's Preview button shows on the panel instead of the saved document. It is
    // not part of the panel's state, so previewing never marks the dashboard as changed.
    const previewDocument$ = new BehaviorSubject<AppDocument | undefined>(undefined);
    // Whether the panel is being laid out or looked at, which decides what an empty app offers.
    const viewMode$ = getViewModeSubject(parentApi) ?? new BehaviorSubject('view');
    const renderedDocument$ = new BehaviorSubject<AppDocument>(initialState.document);

    /** Opens chat with the app as it stands attached, for the agent to build or change. */
    const generateWithChat = (draft: AppDocument) =>
      agentBuilder?.openChat({
        newConversation: true,
        attachments: [
          buildCustomAppContextAttachment({
            document: draft,
            embeddableId: uuid,
            panelTitle: titleManager.api.title$.getValue(),
          }),
        ],
      });

    const dataLayer = createDataLayer({
      runQuery: createRunEsqlQuery({ search, http: core.http }),
      getParameterNames: (query) => getESQLQueryVariables(query),
    });
    dataLayer.setQueries(collectQueries(initialState.document.root));
    const runtime = createAppRuntime(initialState.document);
    // Emits the defaults straight away, then every change a user makes.
    const stateSubscription = runtime.state$.subscribe(dataLayer.setState);

    const serializeState = (): CustomAppEmbeddableState => ({
      ...titleManager.getLatestState(),
      ...timeRangeManager.getLatestState(),
      version: CUSTOM_APP_STATE_VERSION,
      document: document$.getValue(),
    });

    const stateApi = initializeStateApi<CustomAppEmbeddableState>({
      uuid,
      parentApi,
      serializeState,
      anyStateChange$: merge(
        titleManager.anyStateChange$,
        timeRangeManager.anyStateChange$,
        document$.pipe(
          skip(1),
          map(() => undefined)
        )
      ),
      getComparators: () => ({
        ...titleComparators,
        ...timeRangeComparators,
        version: 'skip',
        document: 'deepEquality',
      }),
      applySerializedState: (lastSaved) => {
        titleManager.reinitializeState(lastSaved ?? {});
        timeRangeManager.reinitializeState(lastSaved ?? {});
        if (lastSaved) document$.next(lastSaved.document);
      },
    });

    const api = finalizeApi({
      ...stateApi,
      ...titleManager.api,
      ...timeRangeManager.api,
      dataLoading$: dataLayer.loading$,
      serializeState,
      isEditingEnabled: () => true,
      getDocument: () => document$.getValue(),
      onEdit: async ({ returnFocus } = {}) => {
        const flyoutRef = openLazyFlyout({
          core,
          parentApi,
          returnFocus,
          flyoutProps: { focusedPanelId: uuid, size: 760, minWidth: 520 },
          loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
            const { EditorFlyout } = await import('./editor/editor_flyout');
            return (
              <EditorFlyout
                initialDocument={document$.getValue()}
                ariaLabelledBy={ariaLabelledBy}
                onPreview={(document) => previewDocument$.next(document)}
                onGenerateWithChat={
                  agentBuilder
                    ? (draft) => {
                        // The draft goes with the attachment; chat opens beside the dashboard,
                        // where the editor would be in its way.
                        closeFlyout();
                        generateWithChat(draft);
                      }
                    : undefined
                }
                onCancel={closeFlyout}
                onSave={(document) => {
                  document$.next(document);
                  closeFlyout();
                }}
              />
            );
          },
        });
        flyoutRef.onClose.then(() => previewDocument$.next(undefined));
      },
      getTypeDisplayName: () =>
        i18n.translate('xpack.customApp.embeddable.typeDisplayName', {
          defaultMessage: 'Custom app',
        }),
    });

    // The panel shows the preview while there is one, and the saved document otherwise.
    const renderedSubscription = combineLatest([document$, previewDocument$])
      .pipe(map(([document, preview]) => preview ?? document))
      .subscribe((document) => renderedDocument$.next(document));

    // Whichever document is shown, the runtime and the sources follow it.
    const documentSubscription = renderedDocument$
      .pipe(distinctUntilChanged(), skip(1))
      .subscribe((document) => {
        runtime.setDocument(document);
        dataLayer.setQueries(collectQueries(document.root));
      });

    return {
      api,
      Component: function CustomAppEmbeddableComponent() {
        const [document] = useBatchedPublishingSubjects(renderedDocument$);
        const viewMode = useStateFromPublishingSubject(viewMode$);

        // Subscribed here rather than when the panel is built so that the nodes below, whose
        // effects run first, have already declared the sources they read when the first fetch
        // arrives. The dashboard's time range, filters and reloads reach every node through
        // this one subscription.
        useEffect(() => {
          const fetchSubscription = fetch$(api).subscribe(dataLayer.refresh);
          return () => fetchSubscription.unsubscribe();
        }, []);

        // The agent's answers arrive on the conversation that is open, for whichever panel they
        // are about. A panel takes only its own, and shows the new app at once.
        useEffect(() => {
          if (!agentBuilder) return;

          const subscription = agentBuilder.events.ui.activeConversation$
            .pipe(
              distinctUntilChanged((previous, next) => previous?.id === next?.id),
              switchMap((conversation) =>
                conversation?.id
                  ? agentBuilder.events
                      .getChatEvents$(conversation.id)
                      .pipe(catchError(() => EMPTY))
                  : EMPTY
              )
            )
            .subscribe((event) => {
              if (!isCustomAppUpdatedUiEvent(event)) return;

              const {
                data: { data },
              } = event.data;
              if (data.embeddable_id !== uuid) return;

              const parsed = appDocumentSchema.safeParse(data.document);
              if (parsed.success) document$.next(parsed.data);
            });

          return () => subscription.unsubscribe();
        }, []);

        useEffect(
          () => () => {
            stateSubscription.unsubscribe();
            documentSubscription.unsubscribe();
            renderedSubscription.unsubscribe();
            dataLayer.destroy();
          },
          []
        );

        return (
          <AppRuntimeContext.Provider value={runtime}>
            <DataLayerContext.Provider value={dataLayer}>
              {isEmptyDocument(document) ? (
                <EmptyApp
                  canEdit={viewMode === 'edit'}
                  onBuild={() => api.onEdit()}
                  onDescribe={agentBuilder ? () => generateWithChat(document) : undefined}
                  onUseExample={() => document$.next(createDefaultDocument())}
                />
              ) : (
                <AppFrame>
                  <NodeRenderer node={document.root} />
                </AppFrame>
              )}
            </DataLayerContext.Provider>
          </AppRuntimeContext.Provider>
        );
      },
    };
  },
};

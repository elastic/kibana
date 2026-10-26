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
  type HasLibraryTransforms,
  type HasTypeDisplayName,
  type PublishesDataLoading,
  type PublishesWritableTimeRange,
} from '@kbn/presentation-publishing';
import {
  CUSTOM_APP_EMBEDDABLE_TYPE,
  CUSTOM_APP_STATE_VERSION,
  appDocumentSchema,
  collectSources,
  isEmptyDocument,
  type AppDocument,
} from '@kbn/custom-app-common';
import type {
  CustomAppByReferenceState,
  CustomAppByValueState,
  CustomAppEmbeddableState,
} from '../server';
import { EDITOR_FEATURE_FLAG } from '../common/feature_flags';
import { isByReferenceState } from '../common/by_reference';
import { createSavedAppsClient, type SavedAppsClient } from './application/saved_apps_client';
import { AppFrame } from './components/app_frame';
import { EmptyApp } from './components/empty_app';
import { NodeRenderer } from './components/node_renderer';
import { createDataLayer } from './data/data_layer';
import { DataLayerContext } from './data/data_layer_context';
import { CUSTOM_APP_UPDATED_UI_EVENT, type CustomAppUpdatedUiEventData } from '../common/ui_events';
import type { HasCustomAppDocument } from './has_custom_app_document';
import type { HasCustomAppLibraryId } from './has_library_id';
import { createAppRuntime } from './runtime/app_runtime';
import { AppRuntimeContext } from './runtime/app_runtime_context';
import { TimeRangeControlContext } from './runtime/time_range_context';
import { WorkflowRunnerProvider } from './workflows/workflow_runner';
import { createRunCases } from './data/run_cases';
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
  HasCustomAppLibraryId &
  PublishesDataLoading &
  PublishesWritableTimeRange &
  HasLibraryTransforms<CustomAppByReferenceState, CustomAppByValueState>;

interface LibraryApp {
  title: string;
  description?: string;
  document: AppDocument;
}

/** An app of the library, checked as a panel checks its own: one that is not valid is not shown. */
const loadLibraryApp = async (client: SavedAppsClient, id: string): Promise<LibraryApp> => {
  const { title, description, document } = await client.get(id);
  const parsed = appDocumentSchema.safeParse(document);
  if (!parsed.success) {
    throw new Error(
      i18n.translate('xpack.customApp.embeddable.invalidLibraryApp', {
        defaultMessage: 'The custom app "{title}" cannot be shown: {problems}',
        values: { title, problems: parsed.error.issues.map(({ message }) => message).join('; ') },
      })
    );
  }
  return { title, description, document: parsed.data };
};

export const customAppEmbeddableFactory: EmbeddablePublicDefinition<
  CustomAppEmbeddableState,
  CustomAppApi
> = {
  type: CUSTOM_APP_EMBEDDABLE_TYPE,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const { core, search, agentBuilder } = getServices();
    // Followed for as long as the panel is there, so that a change of the flag shows.
    const editorEnabled$ = new BehaviorSubject(true);
    const editorFlagSubscription = core.featureFlags
      .getBooleanValue$(EDITOR_FEATURE_FLAG, true)
      .subscribe((enabled) => editorEnabled$.next(enabled));
    const savedApps = createSavedAppsClient(core.http);
    // A panel is either an app of its own, or a link to one of the library.
    const libraryId = isByReferenceState(initialState) ? initialState.ref_id : undefined;
    const library = libraryId ? await loadLibraryApp(savedApps, libraryId) : undefined;
    const initialDocument = library
      ? library.document
      : (initialState as CustomAppByValueState).document;

    const titleManager = initializeTitleManager(initialState);
    const timeRangeManager = initializeTimeRangeManager(initialState);
    // What the panel is called until it is given a title of its own.
    const defaultTitle$ = new BehaviorSubject<string | undefined>(library?.title);
    const defaultDescription$ = new BehaviorSubject<string | undefined>(library?.description);
    const document$ = new BehaviorSubject<AppDocument>(initialDocument);

    // What the editor's Preview button shows on the panel instead of the saved document. It is
    // not part of the panel's state, so previewing never marks the dashboard as changed.
    const previewDocument$ = new BehaviorSubject<AppDocument | undefined>(undefined);
    // Whether the panel is being laid out or looked at, which decides what an empty app offers.
    const viewMode$ = getViewModeSubject(parentApi) ?? new BehaviorSubject('view');
    const renderedDocument$ = new BehaviorSubject<AppDocument>(initialDocument);

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
      runCases: createRunCases({ http: core.http }),
      getParameterNames: (query) => getESQLQueryVariables(query),
    });
    dataLayer.setSources(collectSources(initialDocument.root));
    const runtime = createAppRuntime(initialDocument);
    // Emits the defaults straight away, then every change a user makes.
    const stateSubscription = runtime.state$.subscribe(dataLayer.setState);

    // In a dashboard, a time range component sets the period of this panel, as the panel menu's own
    // time range does, and no longer follows the dashboard's. It is saved with the panel.
    const timeRangeControl = { setTimeRange: timeRangeManager.api.setTimeRange };

    const serializeByValue = (): CustomAppByValueState => ({
      ...titleManager.getLatestState(),
      ...timeRangeManager.getLatestState(),
      version: CUSTOM_APP_STATE_VERSION,
      document: document$.getValue(),
    });

    const serializeByReference = (refId: string): CustomAppByReferenceState => ({
      ...titleManager.getLatestState(),
      ...timeRangeManager.getLatestState(),
      ref_id: refId,
    });

    const serializeState = (): CustomAppEmbeddableState =>
      libraryId ? serializeByReference(libraryId) : serializeByValue();

    /**
     * What applying a change to the app does. An app of the library is shared, so it is saved
     * where it lives and every dashboard that has it shows it; one of the panel's own only changes
     * the panel, which the dashboard saves. Says whether it was applied.
     */
    const applyDocument = async (document: AppDocument): Promise<boolean> => {
      if (libraryId && library) {
        try {
          await savedApps.update(libraryId, {
            title: library.title,
            description: library.description,
            document,
          });
        } catch (error) {
          core.notifications.toasts.addDanger({
            title: i18n.translate('xpack.customApp.embeddable.saveLibraryError', {
              defaultMessage: 'The custom app could not be saved to the library',
            }),
            text:
              (error as { body?: { message?: string } })?.body?.message ??
              (error instanceof Error ? error.message : String(error)),
          });
          return false;
        }
      }
      document$.next(document);
      return true;
    };

    const stateApi = initializeStateApi<CustomAppEmbeddableState>({
      uuid,
      parentApi,
      serializeState,
      anyStateChange$: merge(
        titleManager.anyStateChange$,
        timeRangeManager.anyStateChange$,
        // The document of a linked app is saved with it, not with the dashboard.
        libraryId
          ? EMPTY
          : document$.pipe(
              skip(1),
              map(() => undefined)
            )
      ),
      getComparators: () => ({
        ...titleComparators,
        ...timeRangeComparators,
        version: 'skip',
        document: libraryId ? 'skip' : 'deepEquality',
        ref_id: 'skip',
      }),
      applySerializedState: (lastSaved) => {
        titleManager.reinitializeState(lastSaved ?? {});
        timeRangeManager.reinitializeState(lastSaved ?? {});
        if (lastSaved && !isByReferenceState(lastSaved)) document$.next(lastSaved.document);
      },
    });

    const api = finalizeApi({
      ...stateApi,
      ...titleManager.api,
      ...timeRangeManager.api,
      defaultTitle$,
      defaultDescription$,
      dataLoading$: dataLayer.loading$,
      serializeState,
      isEditingEnabled: () => editorEnabled$.getValue(),
      getDocument: () => document$.getValue(),
      getLibraryId: () => libraryId,
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
                isShared={libraryId !== undefined}
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
                onSave={async (document) => {
                  if (await applyDocument(document)) closeFlyout();
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
      // Moving between the dashboard and the library.
      saveToLibrary: async (title: string) => {
        const { id } = await savedApps.create({
          title,
          description: titleManager.getLatestState().description,
          document: document$.getValue(),
        });
        return id;
      },
      getSerializedStateByValue: serializeByValue,
      getSerializedStateByReference: serializeByReference,
      canLinkToLibrary: async () => libraryId === undefined,
      canUnlinkFromLibrary: async () => libraryId !== undefined,
      hasLibraryItemWithTitle: async (title: string) => {
        const { apps } = await savedApps.find({ search: title, page: 1, perPage: 100 });
        return apps.some((app) => app.title.toLowerCase() === title.toLowerCase());
      },
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
        dataLayer.setSources(collectSources(document.root));
      });

    return {
      api,
      Component: function CustomAppEmbeddableComponent() {
        const [document] = useBatchedPublishingSubjects(renderedDocument$);
        const viewMode = useStateFromPublishingSubject(viewMode$);
        const isEditorEnabled = useStateFromPublishingSubject(editorEnabled$);

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
              if (parsed.success) applyDocument(parsed.data);
            });

          return () => subscription.unsubscribe();
        }, []);

        useEffect(
          () => () => {
            stateSubscription.unsubscribe();
            documentSubscription.unsubscribe();
            renderedSubscription.unsubscribe();
            editorFlagSubscription.unsubscribe();
            dataLayer.destroy();
          },
          []
        );

        return (
          <AppRuntimeContext.Provider value={runtime}>
            <TimeRangeControlContext.Provider value={timeRangeControl}>
              <WorkflowRunnerProvider appId={libraryId}>
                <DataLayerContext.Provider value={dataLayer}>
                  {isEmptyDocument(document) ? (
                    <EmptyApp
                      canEdit={viewMode === 'edit'}
                      onBuild={isEditorEnabled ? () => api.onEdit() : undefined}
                      onDescribe={agentBuilder ? () => generateWithChat(document) : undefined}
                      onUseExample={() => document$.next(createDefaultDocument())}
                    />
                  ) : (
                    <AppFrame theme={document.theme}>
                      <NodeRenderer node={document.root} />
                    </AppFrame>
                  )}
                </DataLayerContext.Provider>
              </WorkflowRunnerProvider>
            </TimeRangeControlContext.Provider>
          </AppRuntimeContext.Provider>
        );
      },
    };
  },
};

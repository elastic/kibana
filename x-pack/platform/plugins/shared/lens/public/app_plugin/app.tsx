/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './app.scss';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { TimeRange } from '@kbn/es-query';
import { EuiConfirmModal } from '@elastic/eui';
import { useExecutionContext, useKibana } from '@kbn/kibana-react-plugin/public';
import { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { LensAppProps, LensAppServices } from './types';
import { LensTopNavMenu } from './lens_top_nav';
import { AddUserMessages, EditorFrameInstance, Simplify, UserMessagesGetter } from '../types';
import { LensDocument } from '../persistence/saved_object_store';

import {
  setState,
  applyChanges,
  useLensSelector,
  useLensDispatch,
  LensAppState,
  selectSavedObjectFormat,
  updateIndexPatterns,
  selectActiveDatasourceId,
  selectFramePublicAPI,
  selectIsManaged,
} from '../state_management';
import { SaveModalContainer, runSaveLensVisualization } from './save_modal_container';
import { LensInspector } from '../lens_inspector_service';
import { getEditPath } from '../../common/constants';
import { isLensEqual } from './lens_document_equality';
import {
  type IndexPatternServiceAPI,
  createIndexPatternService,
} from '../data_views_service/service';
import { replaceIndexpattern } from '../state_management/lens_slice';
import { useApplicationUserMessages } from './get_application_user_messages';
import { trackSaveUiCounterEvents } from '../lens_ui_telemetry';
import {
  getCurrentTitle,
  isLegacyEditorEmbeddable,
  setBreadcrumbsTitle,
  useNavigateBackToApp,
  useShortUrlService,
} from './app_helpers';

export type SaveProps = Simplify<
  Omit<OnSaveProps, 'onTitleDuplicate' | 'newDescription'> & {
    returnToOrigin: boolean;
    dashboardId?: string | null;
    onTitleDuplicate?: OnSaveProps['onTitleDuplicate'];
    newDescription?: string;
    newTags?: string[];
    panelTimeRange?: TimeRange;
  }
>;

export function App({
  history,
  onAppLeave,
  redirectTo,
  editorFrame,
  initialInput,
  incomingState,
  redirectToOrigin,
  setHeaderActionMenu,
  datasourceMap,
  visualizationMap,
  contextOriginatingApp,
  topNavMenuEntryGenerators,
  initialContext,
  coreStart,
}: LensAppProps) {
  const lensAppServices = useKibana<LensAppServices>().services;

  const {
    data,
    dataViews,
    uiActions,
    uiSettings,
    chrome,
    inspector: lensInspector,
    application,
    savedObjectsTagging,
    getOriginatingAppName,
    spaces,
    http,
    notifications,
    executionContext,
    locator,
    share,
    serverless,
  } = lensAppServices;

  const saveAndExit = useRef<() => void>();

  const dispatch = useLensDispatch();
  const dispatchSetState = useCallback(
    (state: Partial<LensAppState>) => dispatch(setState(state)),
    [dispatch]
  );

  const {
    persistedDoc,
    sharingSavedObjectProps,
    isLinkedToOriginatingApp,
    searchSessionId,
    datasourceStates,
    isLoading,
    isSaveable,
    visualization,
    annotationGroups,
  } = useLensSelector((state) => state.lens);

  const activeVisualization = visualization.activeId
    ? visualizationMap[visualization.activeId]
    : undefined;

  const selectorDependencies = useMemo(
    () => ({
      datasourceMap,
      visualizationMap,
      extractFilterReferences: data.query.filterManager.extract.bind(data.query.filterManager),
    }),
    [datasourceMap, visualizationMap, data.query.filterManager]
  );

  const currentDoc = useLensSelector((state) =>
    selectSavedObjectFormat(state, selectorDependencies)
  );

  // Used to show a popover that guides the user towards changing the date range when no data is available.
  const [indicateNoData, setIndicateNoData] = useState(false);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [lastKnownDoc, setLastKnownDoc] = useState<LensDocument | undefined>(undefined);
  const [initialDocFromContext, setInitialDocFromContext] = useState<LensDocument | undefined>(
    undefined
  );
  const [shouldCloseAndSaveTextBasedQuery, setShouldCloseAndSaveTextBasedQuery] = useState(false);
  const savedObjectId = initialInput?.savedObjectId;

  const isFromLegacyEditorEmbeddable = isLegacyEditorEmbeddable(initialContext);
  const legacyEditorAppName =
    initialContext && 'originatingApp' in initialContext
      ? initialContext.originatingApp
      : undefined;
  const legacyEditorAppUrl =
    initialContext && 'vizEditorOriginatingAppUrl' in initialContext
      ? initialContext.vizEditorOriginatingAppUrl
      : undefined;
  const initialContextIsEmbedded = Boolean(legacyEditorAppName);

  useEffect(() => {
    if (currentDoc) {
      setLastKnownDoc(currentDoc);
    }
  }, [currentDoc]);

  const showNoDataPopover = useCallback(() => {
    setIndicateNoData(true);
  }, [setIndicateNoData]);

  useExecutionContext(executionContext, {
    type: 'application',
    id: savedObjectId || 'new', // TODO: this doesn't consider when lens is saved by value
    page: 'editor',
  });

  useEffect(() => {
    if (indicateNoData) {
      setIndicateNoData(false);
    }
  }, [setIndicateNoData, indicateNoData, searchSessionId]);

  const getIsByValueMode = useCallback(
    () => Boolean(isLinkedToOriginatingApp && !savedObjectId),
    [isLinkedToOriginatingApp, savedObjectId]
  );

  // Wrap the isEqual call to avoid to carry all the static references
  // around all the time.
  const isLensEqualWrapper = useCallback(
    (refDoc: LensDocument | undefined) => {
      return isLensEqual(
        refDoc,
        lastKnownDoc,
        data.query.filterManager.inject.bind(data.query.filterManager),
        datasourceMap,
        visualizationMap,
        annotationGroups
      );
    },
    [annotationGroups, data.query.filterManager, datasourceMap, lastKnownDoc, visualizationMap]
  );

  useEffect(() => {
    onAppLeave((actions) => {
      if (
        application.capabilities.visualize_v2.save &&
        !isLensEqualWrapper(persistedDoc) &&
        (isSaveable || persistedDoc)
      ) {
        return actions.confirm(
          i18n.translate('xpack.lens.app.unsavedWorkMessage', {
            defaultMessage: 'Leave with unsaved changes?',
          }),
          i18n.translate('xpack.lens.app.unsavedWorkTitle', {
            defaultMessage: 'Unsaved changes',
          }),
          undefined,
          i18n.translate('xpack.lens.app.unsavedWorkConfirmBtn', {
            defaultMessage: 'Discard changes',
          }),
          'danger'
        );
      } else {
        return actions.default();
      }
    });
  }, [
    onAppLeave,
    lastKnownDoc,
    isSaveable,
    persistedDoc,
    application.capabilities.visualize_v2.save,
    data.query.filterManager,
    datasourceMap,
    visualizationMap,
    annotationGroups,
    isLensEqualWrapper,
  ]);

  const getLegacyUrlConflictCallout = useCallback(() => {
    // This function returns a callout component *if* we have encountered a "legacy URL conflict" scenario
    if (spaces && sharingSavedObjectProps?.outcome === 'conflict' && persistedDoc?.savedObjectId) {
      // We have resolved to one object, but another object has a legacy URL alias associated with this ID/page. We should display a
      // callout with a warning for the user, and provide a way for them to navigate to the other object.
      const currentObjectId = persistedDoc.savedObjectId;
      const otherObjectId = sharingSavedObjectProps?.aliasTargetId!; // This is always defined if outcome === 'conflict'
      const otherObjectPath = http.basePath.prepend(
        `${getEditPath(otherObjectId)}${history.location.search}`
      );
      return spaces.ui.components.getLegacyUrlConflict({
        objectNoun: i18n.translate('xpack.lens.appName', {
          defaultMessage: 'Lens visualization',
        }),
        currentObjectId,
        otherObjectId,
        otherObjectPath,
      });
    }
    return null;
  }, [persistedDoc, sharingSavedObjectProps, spaces, http, history]);

  // Sync Kibana breadcrumbs any time the saved document's title changes
  useEffect(() => {
    const isByValueMode = getIsByValueMode();
    const currentDocTitle = getCurrentTitle(persistedDoc, isByValueMode, initialContext);
    setBreadcrumbsTitle(
      { application, chrome, serverless },
      {
        isByValueMode,
        currentDocTitle,
        redirectToOrigin,
        isFromLegacyEditor: Boolean(isLinkedToOriginatingApp || legacyEditorAppName),
        originatingAppName: getOriginatingAppName(),
      }
    );
  }, [
    getOriginatingAppName,
    redirectToOrigin,
    getIsByValueMode,
    application,
    chrome,
    isLinkedToOriginatingApp,
    persistedDoc,
    isFromLegacyEditorEmbeddable,
    legacyEditorAppName,
    serverless,
    initialContext,
  ]);

  const switchDatasource = useCallback(() => {
    if (saveAndExit && saveAndExit.current) {
      saveAndExit.current();
    }
  }, []);

  const runSave = useCallback(
    async (saveProps: SaveProps, options: { saveToLibrary: boolean }) => {
      dispatch(applyChanges());
      const prevVisState =
        persistedDoc?.visualizationType === visualization.activeId
          ? persistedDoc?.state.visualization
          : undefined;

      const telemetryEvents = activeVisualization?.getTelemetryEventsOnSave?.(
        visualization.state,
        prevVisState
      );
      if (telemetryEvents && telemetryEvents.length) {
        trackSaveUiCounterEvents(telemetryEvents);
      }
      try {
        const newState = await runSaveLensVisualization(
          {
            lastKnownDoc,
            savedObjectsTagging,
            initialInput,
            redirectToOrigin,
            persistedDoc,
            onAppLeave,
            redirectTo,
            switchDatasource,
            originatingApp: incomingState?.originatingApp,
            textBasedLanguageSave: shouldCloseAndSaveTextBasedQuery,
            ...lensAppServices,
          },
          saveProps,
          options
        );
        if (newState) {
          dispatchSetState(newState);
          setIsSaveModalVisible(false);
          setShouldCloseAndSaveTextBasedQuery(false);
        }
      } catch (e) {
        // error is handled inside the modal
        // so ignoring it here
      }
    },
    [
      visualization.activeId,
      visualization.state,
      activeVisualization,
      dispatch,
      lastKnownDoc,
      savedObjectsTagging,
      initialInput,
      redirectToOrigin,
      persistedDoc,
      onAppLeave,
      redirectTo,
      switchDatasource,
      incomingState?.originatingApp,
      shouldCloseAndSaveTextBasedQuery,
      lensAppServices,
      dispatchSetState,
    ]
  );

  // keeping the initial doc state created by the context
  useEffect(() => {
    if (lastKnownDoc && !initialDocFromContext) {
      setInitialDocFromContext(lastKnownDoc);
    }
  }, [lastKnownDoc, initialDocFromContext]);

  const {
    shouldShowGoBackToVizEditorModal,
    goBackToOriginatingApp,
    navigateToVizEditor,
    closeGoBackToVizEditorModal,
  } = useNavigateBackToApp({
    application,
    onAppLeave,
    legacyEditorAppName,
    legacyEditorAppUrl,
    initialDocFromContext,
    persistedDoc,
    isLensEqual: isLensEqualWrapper,
  });

  const indexPatternService = useMemo(
    () =>
      createIndexPatternService({
        dataViews,
        uiActions,
        core: { http, notifications, uiSettings },
        contextDataViewSpec: (initialContext as VisualizeFieldContext | undefined)?.dataViewSpec,
        updateIndexPatterns: (newIndexPatternsState, options) => {
          dispatch(updateIndexPatterns(newIndexPatternsState));
          if (options?.applyImmediately) {
            dispatch(applyChanges());
          }
        },
        replaceIndexPattern: (newIndexPattern, oldId, options) => {
          dispatch(replaceIndexpattern({ newIndexPattern, oldId }));
          if (options?.applyImmediately) {
            dispatch(applyChanges());
          }
        },
      }),
    [dataViews, uiActions, http, notifications, uiSettings, initialContext, dispatch]
  );

  const shortUrlService = useShortUrlService(locator, share);

  const isManaged = useLensSelector(selectIsManaged);

  const returnToOriginSwitchLabelForContext =
    isFromLegacyEditorEmbeddable && !persistedDoc
      ? i18n.translate('xpack.lens.app.replacePanel', {
          defaultMessage: 'Replace panel on {originatingApp}',
          values: {
            originatingApp: initialContext?.originatingApp,
          },
        })
      : undefined;

  const activeDatasourceId = useLensSelector(selectActiveDatasourceId);

  const framePublicAPI = useLensSelector((state) => selectFramePublicAPI(state, datasourceMap));

  const { getUserMessages, addUserMessages } = useApplicationUserMessages({
    coreStart,
    framePublicAPI,
    activeDatasourceId,
    datasourceState:
      activeDatasourceId && datasourceStates[activeDatasourceId]
        ? datasourceStates[activeDatasourceId]
        : null,
    datasource:
      activeDatasourceId && datasourceMap[activeDatasourceId]
        ? datasourceMap[activeDatasourceId]
        : null,
    dispatch,
    visualization: activeVisualization,
    visualizationType: visualization.activeId,
    visualizationState: visualization,
  });

  return (
    <>
      <div className="lnsApp" data-test-subj="lnsApp" role="main">
        <LensTopNavMenu
          initialInput={initialInput}
          redirectToOrigin={redirectToOrigin}
          getIsByValueMode={getIsByValueMode}
          onAppLeave={onAppLeave}
          runSave={runSave}
          setIsSaveModalVisible={setIsSaveModalVisible}
          setHeaderActionMenu={setHeaderActionMenu}
          indicateNoData={indicateNoData}
          datasourceMap={datasourceMap}
          visualizationMap={visualizationMap}
          title={persistedDoc?.title}
          lensInspector={lensInspector}
          currentDoc={currentDoc}
          isCurrentStateDirty={!isLensEqualWrapper(persistedDoc)}
          goBackToOriginatingApp={goBackToOriginatingApp}
          contextOriginatingApp={contextOriginatingApp}
          initialContextIsEmbedded={initialContextIsEmbedded}
          topNavMenuEntryGenerators={topNavMenuEntryGenerators}
          initialContext={initialContext}
          indexPatternService={indexPatternService}
          getUserMessages={getUserMessages}
          shortUrlService={shortUrlService}
          startServices={coreStart}
        />
        {getLegacyUrlConflictCallout()}
        {(!isLoading || persistedDoc) && (
          <MemoizedEditorFrameWrapper
            editorFrame={editorFrame}
            showNoDataPopover={showNoDataPopover}
            lensInspector={lensInspector}
            indexPatternService={indexPatternService}
            getUserMessages={getUserMessages}
            addUserMessages={addUserMessages}
          />
        )}
      </div>
      {isSaveModalVisible && (
        <SaveModalContainer
          lensServices={lensAppServices}
          originatingApp={
            isLinkedToOriginatingApp
              ? incomingState?.originatingApp ?? initialContext?.originatingApp
              : undefined
          }
          isSaveable={isSaveable}
          runSave={runSave}
          onClose={() => {
            setIsSaveModalVisible(false);
          }}
          getAppNameFromId={() => getOriginatingAppName()}
          lastKnownDoc={lastKnownDoc}
          onAppLeave={onAppLeave}
          persistedDoc={persistedDoc}
          initialInput={initialInput}
          redirectTo={redirectTo}
          redirectToOrigin={redirectToOrigin}
          managed={isManaged}
          initialContext={initialContext}
          returnToOriginSwitchLabel={
            returnToOriginSwitchLabelForContext ??
            (getIsByValueMode() && initialInput
              ? i18n.translate('xpack.lens.app.updatePanel', {
                  defaultMessage: 'Update panel on {originatingAppName}',
                  values: { originatingAppName: getOriginatingAppName() },
                })
              : undefined)
          }
        />
      )}
      {shouldShowGoBackToVizEditorModal && (
        <EuiConfirmModal
          maxWidth={600}
          title={i18n.translate('xpack.lens.app.unsavedWorkTitle', {
            defaultMessage: 'Unsaved changes',
          })}
          onCancel={closeGoBackToVizEditorModal}
          onConfirm={navigateToVizEditor}
          cancelButtonText={i18n.translate('xpack.lens.app.goBackModalCancelBtn', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('xpack.lens.app.unsavedWorkConfirmBtn', {
            defaultMessage: 'Discard changes',
          })}
          buttonColor="danger"
          defaultFocusedButton="confirm"
          data-test-subj="lnsApp_discardChangesModalOrigin"
        >
          {i18n.translate('xpack.lens.app.goBackModalMessage', {
            defaultMessage:
              'Your changes here won’t work with your original {contextOriginatingApp} visualization. Leave with unsaved changes and return to {contextOriginatingApp}?',
            values: { contextOriginatingApp },
          })}
        </EuiConfirmModal>
      )}
    </>
  );
}

const MemoizedEditorFrameWrapper = React.memo(function EditorFrameWrapper({
  editorFrame,
  showNoDataPopover,
  getUserMessages,
  addUserMessages,
  lensInspector,
  indexPatternService,
}: {
  editorFrame: EditorFrameInstance;
  lensInspector: LensInspector;
  showNoDataPopover: () => void;
  getUserMessages: UserMessagesGetter;
  addUserMessages: AddUserMessages;
  indexPatternService: IndexPatternServiceAPI;
}) {
  const { EditorFrameContainer } = editorFrame;
  return (
    <EditorFrameContainer
      showNoDataPopover={showNoDataPopover}
      getUserMessages={getUserMessages}
      addUserMessages={addUserMessages}
      lensInspector={lensInspector}
      indexPatternService={indexPatternService}
    />
  );
});

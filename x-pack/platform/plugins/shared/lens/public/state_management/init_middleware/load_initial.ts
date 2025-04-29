/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { MiddlewareAPI } from '@reduxjs/toolkit';
import { i18n } from '@kbn/i18n';
import { History } from 'history';
import { setState, initExisting, initEmpty, LensStoreDeps, LensAppState } from '..';
import { type InitialAppState, disableAutoApply, getPreloadedState } from '../lens_slice';
import { SharingSavedObjectProps } from '../../types';
import { getInitialDatasourceId, getInitialDataViewsObject } from '../../utils';
import { initializeSources } from '../../editor_frame_service/editor_frame';
import { LensAppServices } from '../../app_plugin/types';
import { getEditPath, getFullPath, LENS_EMBEDDABLE_TYPE } from '../../../common/constants';
import { LensDocument } from '../../persistence';
import { LensSerializedState } from '../../react_embeddable/types';

interface PersistedDoc {
  doc: LensDocument;
  sharingSavedObjectProps: Omit<SharingSavedObjectProps, 'sourceId'>;
  managed: boolean;
}

/**
 * This function returns a Saved object from a either a by reference or by value input
 */
export const getFromPreloaded = async ({
  initialInput,
  lensServices,
  history,
}: {
  initialInput: LensSerializedState;
  lensServices: Pick<LensAppServices, 'attributeService' | 'notifications' | 'spaces' | 'http'>;
  history?: History<unknown>;
}): Promise<PersistedDoc | undefined> => {
  const { notifications, spaces, attributeService } = lensServices;
  let doc: LensDocument;

  try {
    const docFromSavedObject = await (initialInput.savedObjectId
      ? attributeService.loadFromLibrary(initialInput.savedObjectId)
      : undefined);
    if (!docFromSavedObject) {
      return {
        // @TODO: it would be nice to address this type checks once for all
        doc: {
          ...initialInput.attributes,
          type: LENS_EMBEDDABLE_TYPE,
        } as LensDocument,
        sharingSavedObjectProps: {
          outcome: 'exactMatch',
        },
        managed: false,
      };
    }
    const { sharingSavedObjectProps, attributes, managed } = docFromSavedObject;
    if (spaces && sharingSavedObjectProps?.outcome === 'aliasMatch' && history) {
      // We found this object by a legacy URL alias from its old ID; redirect the user to the page with its new ID, preserving any URL hash
      const newObjectId = sharingSavedObjectProps.aliasTargetId!; // This is always defined if outcome === 'aliasMatch'
      const newPath = lensServices.http.basePath.prepend(
        `${getEditPath(newObjectId)}${history.location.search}`
      );
      await spaces.ui.redirectLegacyUrl({
        path: newPath,
        aliasPurpose: sharingSavedObjectProps.aliasPurpose,
        objectNoun: i18n.translate('xpack.lens.legacyUrlConflict.objectNoun', {
          defaultMessage: 'Lens visualization',
        }),
      });
    }
    doc = {
      ...initialInput,
      ...attributes,
      type: LENS_EMBEDDABLE_TYPE,
    };

    return {
      doc,
      sharingSavedObjectProps: {
        aliasTargetId: sharingSavedObjectProps?.aliasTargetId,
        outcome: sharingSavedObjectProps?.outcome,
      },
      managed: Boolean(managed),
    };
  } catch (e) {
    notifications.toasts.addDanger(
      i18n.translate('xpack.lens.app.docLoadingError', {
        defaultMessage: 'Error loading saved document',
      })
    );
  }
};

interface LoaderSharedArgs {
  visualizationMap: LensStoreDeps['visualizationMap'];
  datasourceMap: LensStoreDeps['datasourceMap'];
  initialContext: LensStoreDeps['initialContext'];
  dataViews: LensStoreDeps['lensServices']['dataViews'];
  storage: LensStoreDeps['lensServices']['storage'];
  eventAnnotationService: LensStoreDeps['lensServices']['eventAnnotationService'];
  defaultIndexPatternId: string;
}

type PreloadedState = Omit<
  LensAppState,
  'resolvedDateRange' | 'searchSessionId' | 'isLinkedToOriginatingApp'
>;

async function loadFromLocatorState(
  store: MiddlewareAPI,
  initialState: NonNullable<LensStoreDeps['initialStateFromLocator']>,
  loaderSharedArgs: LoaderSharedArgs,
  { notifications, data }: LensStoreDeps['lensServices'],
  emptyState: PreloadedState,
  autoApplyDisabled: boolean
) {
  const { lens } = store.getState();
  const locatorReferences = 'references' in initialState ? initialState.references : undefined;

  const {
    datasourceStates,
    visualizationState,
    indexPatterns,
    indexPatternRefs,
    annotationGroups,
  } = await initializeSources(
    {
      visualizationState: emptyState.visualization,
      datasourceStates: emptyState.datasourceStates,
      adHocDataViews: lens.persistedDoc?.state.adHocDataViews || initialState.dataViewSpecs,
      references: locatorReferences,
      ...loaderSharedArgs,
    },
    {
      isFullEditor: true,
    }
  );
  const currentSessionId = initialState?.searchSessionId || data.search.session.getSessionId();
  store.dispatch(
    initExisting({
      isSaveable: true,
      filters: initialState.filters || data.query.filterManager.getFilters(),
      query: initialState.query || emptyState.query,
      searchSessionId: currentSessionId,
      activeDatasourceId: emptyState.activeDatasourceId,
      visualization: {
        activeId: emptyState.visualization.activeId,
        state: visualizationState,
      },
      dataViews: getInitialDataViewsObject(indexPatterns, indexPatternRefs),
      datasourceStates: Object.entries(datasourceStates).reduce(
        (state, [datasourceId, datasourceState]) => ({
          ...state,
          [datasourceId]: {
            ...datasourceState,
            isLoading: false,
          },
        }),
        {}
      ),
      isLoading: false,
      annotationGroups,
    })
  );

  if (autoApplyDisabled) {
    store.dispatch(disableAutoApply());
  }
}

async function loadFromEmptyState(
  store: MiddlewareAPI,
  emptyState: PreloadedState,
  loaderSharedArgs: LoaderSharedArgs,
  { data }: LensStoreDeps['lensServices'],
  activeDatasourceId: string | undefined,
  autoApplyDisabled: boolean
) {
  const { lens } = store.getState();
  const { datasourceStates, indexPatterns, indexPatternRefs } = await initializeSources(
    {
      visualizationState: lens.visualization,
      datasourceStates: lens.datasourceStates,
      adHocDataViews: lens.persistedDoc?.state.adHocDataViews,
      ...loaderSharedArgs,
    },
    {
      isFullEditor: true,
    }
  );

  store.dispatch(
    initEmpty({
      newState: {
        ...emptyState,
        dataViews: getInitialDataViewsObject(indexPatterns, indexPatternRefs),
        searchSessionId: data.search.session.getSessionId() || data.search.session.start(),
        ...(activeDatasourceId && { activeDatasourceId }),
        datasourceStates: Object.entries(datasourceStates).reduce(
          (state, [datasourceId, datasourceState]) => ({
            ...state,
            [datasourceId]: {
              ...datasourceState,
              isLoading: false,
            },
          }),
          {}
        ),
        isLoading: false,
      },
      initialContext: loaderSharedArgs.initialContext,
    })
  );
  if (autoApplyDisabled) {
    store.dispatch(disableAutoApply());
  }
}

async function loadFromSavedObject(
  store: MiddlewareAPI,
  savedObjectId: string | undefined,
  persisted: PersistedDoc,
  loaderSharedArgs: LoaderSharedArgs,
  { data, chrome }: LensStoreDeps['lensServices'],
  autoApplyDisabled: boolean,
  inlineEditing?: boolean
) {
  const { doc, sharingSavedObjectProps, managed } = persisted;
  if (savedObjectId) {
    chrome.recentlyAccessed.add(getFullPath(savedObjectId), doc.title, savedObjectId);
  }

  const docDatasourceStates = Object.entries(doc.state.datasourceStates).reduce(
    (stateMap, [datasourceId, datasourceState]) => ({
      ...stateMap,
      [datasourceId]: {
        isLoading: true,
        state: datasourceState,
      },
    }),
    {}
  );

  // when the embeddable is initialized from the dashboard we don't want to inject the filters
  // as this will replace the parent application filters (such as a dashboard)
  if (!inlineEditing) {
    const filters = data.query.filterManager.inject(doc.state.filters, doc.references);
    // Don't overwrite any pinned filters
    data.query.filterManager.setAppFilters(filters);
  }

  const docVisualizationState = {
    activeId: doc.visualizationType,
    state: doc.state.visualization,
  };
  const {
    datasourceStates,
    visualizationState,
    indexPatterns,
    indexPatternRefs,
    annotationGroups,
  } = await initializeSources(
    {
      visualizationState: docVisualizationState,
      datasourceStates: docDatasourceStates,
      references: [...doc.references, ...(doc.state.internalReferences || [])],
      adHocDataViews: doc.state.adHocDataViews,
      ...loaderSharedArgs,
    },
    { isFullEditor: true }
  );
  const currentSessionId = data.search.session.getSessionId();
  store.dispatch(
    initExisting({
      isSaveable: true,
      sharingSavedObjectProps,
      filters: data.query.filterManager.getFilters(),
      query: doc.state.query,
      searchSessionId:
        !savedObjectId && currentSessionId
          ? currentSessionId
          : !inlineEditing
          ? data.search.session.start()
          : undefined,
      persistedDoc: doc,
      activeDatasourceId: getInitialDatasourceId(loaderSharedArgs.datasourceMap, doc),
      visualization: {
        activeId: doc.visualizationType,
        state: visualizationState,
      },
      dataViews: getInitialDataViewsObject(indexPatterns, indexPatternRefs),
      datasourceStates: Object.entries(datasourceStates).reduce(
        (state, [datasourceId, datasourceState]) => ({
          ...state,
          [datasourceId]: {
            ...datasourceState,
            isLoading: false,
          },
        }),
        {}
      ),
      isLoading: false,
      annotationGroups,
      managed,
    })
  );

  if (autoApplyDisabled) {
    store.dispatch(disableAutoApply());
  }
}

export async function loadInitial(
  store: MiddlewareAPI,
  storeDeps: LensStoreDeps,
  { redirectCallback, initialInput, history, inlineEditing }: InitialAppState,
  autoApplyDisabled: boolean
) {
  const { lensServices, datasourceMap, initialContext, initialStateFromLocator, visualizationMap } =
    storeDeps;
  const { resolvedDateRange, searchSessionId, isLinkedToOriginatingApp, ...emptyState } =
    getPreloadedState(storeDeps);
  const { notifications, data } = lensServices;
  const { lens } = store.getState();

  const loaderSharedArgs: LoaderSharedArgs = {
    visualizationMap,
    initialContext,
    datasourceMap,
    dataViews: lensServices.dataViews,
    storage: lensServices.storage,
    eventAnnotationService: lensServices.eventAnnotationService,
    defaultIndexPatternId: lensServices.uiSettings.get('defaultIndex'),
  };

  let activeDatasourceId: string | undefined;
  if (initialContext && 'query' in initialContext) {
    activeDatasourceId = 'textBased';
  }
  if (initialStateFromLocator) {
    const newFilters = initialStateFromLocator.filters
      ? cloneDeep(initialStateFromLocator.filters)
      : undefined;

    if (newFilters) {
      data.query.filterManager.setAppFilters(newFilters);
    }

    if (initialStateFromLocator.resolvedDateRange) {
      const newTimeRange = {
        from: initialStateFromLocator.resolvedDateRange.fromDate,
        to: initialStateFromLocator.resolvedDateRange.toDate,
      };
      data.query.timefilter.timefilter.setTime(newTimeRange);
    }
    // URL Reporting is using the locator params but also passing the savedObjectId
    // so be sure to not go here as there's no full snapshot URL
    if (!initialInput) {
      try {
        return loadFromLocatorState(
          store,
          initialStateFromLocator,
          loaderSharedArgs,
          lensServices,
          emptyState,
          autoApplyDisabled
        );
      } catch ({ message }) {
        notifications.toasts.addDanger({
          title: message,
        });
        return;
      }
    }
  }

  if (
    !initialInput ||
    (initialInput.savedObjectId && initialInput.savedObjectId === lens.persistedDoc?.savedObjectId)
  ) {
    const newFilters =
      initialContext && 'searchFilters' in initialContext && initialContext.searchFilters
        ? cloneDeep(initialContext.searchFilters)
        : undefined;

    if (newFilters) {
      data.query.filterManager.setAppFilters(newFilters);
    }
    try {
      return loadFromEmptyState(
        store,
        emptyState,
        loaderSharedArgs,
        lensServices,
        activeDatasourceId,
        autoApplyDisabled
      );
    } catch ({ message }) {
      notifications.toasts.addDanger({
        title: message,
      });
      return redirectCallback?.();
    }
  }

  try {
    const persisted = await getFromPreloaded({ initialInput, lensServices, history });
    if (persisted) {
      try {
        return loadFromSavedObject(
          store,
          initialInput.savedObjectId,
          persisted,
          loaderSharedArgs,
          lensServices,
          autoApplyDisabled,
          inlineEditing
        );
      } catch ({ message }) {
        notifications.toasts.addDanger({
          title: message,
        });
      }
    } else {
      return redirectCallback?.();
    }
  } catch (e) {
    try {
      store.dispatch(
        setState({
          isLoading: false,
        })
      );
      redirectCallback?.();
    } catch ({ message }) {
      notifications.toasts.addDanger({
        title: message,
      });
      redirectCallback?.();
    }
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HasLibraryTransforms,
  PublishesWritableTitle,
  PublishesWritableDescription,
  SerializedTitles,
  StateComparators,
  initializeTitleManager,
  titleComparators,
} from '@kbn/presentation-publishing';
import { apiIsPresentationContainer, apiPublishesSettings } from '@kbn/presentation-containers';
import { BehaviorSubject, Observable, map, merge } from 'rxjs';
import { isTextBasedLanguage } from '../helper';
import type {
  LensComponentProps,
  LensPanelProps,
  LensRuntimeState,
  LensEmbeddableStartServices,
  LensOverrides,
  LensSharedProps,
  IntegrationCallbacks,
  LensInternalApi,
  LensApi,
  LensSerializedState,
} from '../types';
import { apiHasLensComponentProps } from '../type_guards';
import { StateManagementConfig } from './initialize_state_management';

// Convenience type for the serialized props of this initializer
type SerializedProps = SerializedTitles & LensPanelProps & LensOverrides & LensSharedProps;

export const dashboardServicesComparators: StateComparators<SerializedProps> = {
  ...titleComparators,
  disableTriggers: 'referenceEquality',
  overrides: 'referenceEquality',
  id: 'skip',
  palette: 'skip',
  renderMode: 'skip',
  syncColors: 'skip',
  syncCursor: 'skip',
  syncTooltips: 'skip',
  executionContext: 'skip',
  noPadding: 'skip',
  viewMode: 'skip',
  style: 'skip',
  className: 'skip',
  forceDSL: 'skip',
};

export interface DashboardServicesConfig {
  api: PublishesWritableTitle &
    PublishesWritableDescription &
    HasLibraryTransforms<LensSerializedState, LensSerializedState> &
    Pick<LensApi, 'parentApi'> &
    Pick<IntegrationCallbacks, 'updateOverrides' | 'getTriggerCompatibleActions'>;
  anyStateChange$: Observable<void>;
  getLatestState: () => SerializedProps;
  reinitializeState: (lastSaved?: LensSerializedState) => void;
}

/**
 * Everything about panel and library services
 */
export function initializeDashboardServices(
  initialState: LensRuntimeState,
  getLatestState: () => LensRuntimeState,
  internalApi: LensInternalApi,
  stateConfig: StateManagementConfig,
  parentApi: unknown,
  titleManager: ReturnType<typeof initializeTitleManager>,
  { attributeService, uiActions }: LensEmbeddableStartServices
): DashboardServicesConfig {
  // For some legacy reason the title and description default value is picked differently
  // ( based on existing FTR tests ).
  const defaultTitle$ = new BehaviorSubject<string | undefined>(initialState.attributes.title);
  const defaultDescription$ = new BehaviorSubject<string | undefined>(
    initialState.savedObjectId
      ? internalApi.attributes$.getValue().description || initialState.description
      : initialState.description
  );

  return {
    api: {
      parentApi: apiIsPresentationContainer(parentApi) ? parentApi : undefined,
      defaultTitle$,
      defaultDescription$,
      ...titleManager.api,
      updateOverrides: internalApi.updateOverrides,
      getTriggerCompatibleActions: uiActions.getTriggerCompatibleActions,

      // The functions below fulfill the HasLibraryTransforms interface
      saveToLibrary: async (title: string) => {
        const { attributes } = getLatestState();
        const savedObjectId = await attributeService.saveToLibrary(
          {
            ...attributes,
            title,
          },
          attributes.references
        );
        // keep in sync the state
        stateConfig.api.updateSavedObjectId(savedObjectId);
        return savedObjectId;
      },
      checkForDuplicateTitle: async (
        newTitle: string,
        isTitleDuplicateConfirmed: boolean,
        onTitleDuplicate: () => void
      ) => {
        await attributeService.checkForDuplicateTitle({
          newTitle,
          isTitleDuplicateConfirmed,
          onTitleDuplicate,
          newCopyOnSave: false,
          newDescription: '',
          displayName: '',
          lastSavedTitle: '',
          copyOnSave: false,
        });
      },
      canLinkToLibrary: async () =>
        !getLatestState().savedObjectId && !isTextBasedLanguage(getLatestState()),
      canUnlinkFromLibrary: async () => Boolean(getLatestState().savedObjectId),
      getSerializedStateByReference: (newId: string) => {
        const currentState = getLatestState();
        currentState.savedObjectId = newId;
        return attributeService.extractReferences(currentState);
      },
      getSerializedStateByValue: () => {
        const { savedObjectId, ...byValueRuntimeState } = getLatestState();
        return attributeService.extractReferences(byValueRuntimeState);
      },
    },
    anyStateChange$: merge(
      titleManager.anyStateChange$,
      internalApi.overrides$,
      internalApi.disableTriggers$
    ).pipe(map(() => undefined)),
    getLatestState: () => {
      const { style, className } = apiHasLensComponentProps(parentApi)
        ? parentApi
        : ({} as LensComponentProps);
      const settings = apiPublishesSettings(parentApi)
        ? {
            syncColors: parentApi.settings.syncColors$.getValue(),
            syncCursor: parentApi.settings.syncCursor$.getValue(),
            syncTooltips: parentApi.settings.syncTooltips$.getValue(),
          }
        : {};
      return {
        ...titleManager.getLatestState(),
        style,
        className,
        ...settings,
        palette: initialState.palette,
        overrides: internalApi.overrides$.getValue(),
        disableTriggers: internalApi.disableTriggers$.getValue(),
      };
    },
    reinitializeState: (lastSaved?: LensSerializedState) => {
      titleManager.reinitializeState(lastSaved);
      internalApi.updateDisabledTriggers(lastSaved?.disableTriggers);
      internalApi.updateOverrides(lastSaved?.overrides);
    },
  };
}

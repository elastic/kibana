/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash';
import {
  HasLibraryTransforms,
  PublishesWritableTitle,
  PublishesWritableDescription,
  SerializedTitles,
  StateComparators,
  getUnchangingComparator,
  initializeTitleManager,
} from '@kbn/presentation-publishing';
import { apiIsPresentationContainer, apiPublishesSettings } from '@kbn/presentation-containers';
import { buildObservableVariable, isTextBasedLanguage } from '../helper';
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

export interface DashboardServicesConfig {
  api: PublishesWritableTitle &
    PublishesWritableDescription &
    HasLibraryTransforms<LensSerializedState, LensSerializedState> &
    Pick<LensApi, 'parentApi'> &
    Pick<IntegrationCallbacks, 'updateOverrides' | 'getTriggerCompatibleActions'>;
  serialize: () => SerializedProps;
  comparators: StateComparators<
    SerializedProps & Pick<LensApi, 'parentApi'> & { isNewPanel?: boolean }
  >;
  cleanup: () => void;
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
  const [defaultTitle$] = buildObservableVariable<string | undefined>(
    initialState.title || internalApi.attributes$.getValue().title
  );
  const [defaultDescription$] = buildObservableVariable<string | undefined>(
    initialState.savedObjectId
      ? internalApi.attributes$.getValue().description || initialState.description
      : initialState.description
  );
  // The observable references here are the same to the internalApi,
  // the buildObservableVariable re-uses the same observable when detected but it builds the right comparator
  const [overrides$, overridesComparator] = buildObservableVariable<LensOverrides['overrides']>(
    internalApi.overrides$
  );
  const [disableTriggers$, disabledTriggersComparator] = buildObservableVariable<
    boolean | undefined
  >(internalApi.disableTriggers$);

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
    serialize: () => {
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
        ...titleManager.serialize(),
        style,
        className,
        ...settings,
        palette: initialState.palette,
        overrides: overrides$.getValue(),
        disableTriggers: disableTriggers$.getValue(),
      };
    },
    comparators: {
      ...titleManager.comparators,
      id: getUnchangingComparator<SerializedTitles & LensPanelProps, 'id'>(),
      palette: getUnchangingComparator<SerializedTitles & LensPanelProps, 'palette'>(),
      renderMode: getUnchangingComparator<SerializedTitles & LensPanelProps, 'renderMode'>(),
      syncColors: getUnchangingComparator<SerializedTitles & LensPanelProps, 'syncColors'>(),
      syncCursor: getUnchangingComparator<SerializedTitles & LensPanelProps, 'syncCursor'>(),
      syncTooltips: getUnchangingComparator<SerializedTitles & LensPanelProps, 'syncTooltips'>(),
      executionContext: getUnchangingComparator<LensSharedProps, 'executionContext'>(),
      noPadding: getUnchangingComparator<LensSharedProps, 'noPadding'>(),
      viewMode: getUnchangingComparator<LensSharedProps, 'viewMode'>(),
      style: getUnchangingComparator<LensSharedProps, 'style'>(),
      className: getUnchangingComparator<LensSharedProps, 'className'>(),
      overrides: overridesComparator,
      disableTriggers: disabledTriggersComparator,
      forceDSL: getUnchangingComparator<LensSharedProps, 'forceDSL'>(),
      isNewPanel: getUnchangingComparator<{ isNewPanel?: boolean }, 'isNewPanel'>(),
      parentApi: getUnchangingComparator<Pick<LensApi, 'parentApi'>, 'parentApi'>(),
    },
    cleanup: noop,
  };
}

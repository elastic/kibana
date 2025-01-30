/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import React from 'react';
import { EditLensConfigurationProps } from '../../app_plugin/shared/edit_on_the_fly/get_edit_lens_configuration';
import { EditConfigPanelProps } from '../../app_plugin/shared/edit_on_the_fly/types';
import { getActiveDatasourceIdFromDoc } from '../../utils';
import { isTextBasedLanguage } from '../helper';
import {
  GetStateType,
  LensEmbeddableStartServices,
  LensInspectorAdapters,
  LensInternalApi,
  LensRuntimeState,
  TypedLensSerializedState,
} from '../types';
import { PanelManagementApi } from './panel_management';
import { getStateManagementForInlineEditing } from './state_management';

export function prepareInlineEditPanel(
  initialState: LensRuntimeState,
  getState: GetStateType,
  updateState: (newState: Pick<LensRuntimeState, 'attributes' | 'savedObjectId'>) => void,
  { dataLoading$, isNewlyCreated$ }: Pick<LensInternalApi, 'dataLoading$' | 'isNewlyCreated$'>,
  panelManagementApi: PanelManagementApi,
  inspectorApi: LensInspectorAdapters,
  {
    coreStart,
    ...startDependencies
  }: Omit<
    LensEmbeddableStartServices,
    | 'timefilter'
    | 'coreHttp'
    | 'capabilities'
    | 'expressionRenderer'
    | 'documentToExpression'
    | 'injectFilterReferences'
    | 'visualizationMap'
    | 'datasourceMap'
    | 'theme'
    | 'uiSettings'
    | 'attributeService'
  >,
  navigateToLensEditor?: (
    stateTransfer: EmbeddableStateTransfer,
    skipAppLeave?: boolean
  ) => () => Promise<void>,
  uuid?: string,
  parentApi?: unknown
) {
  return async function openConfigPanel({
    onApply,
    onCancel,
    hideTimeFilterInfo,
  }: Partial<Pick<EditConfigPanelProps, 'onApply' | 'onCancel' | 'hideTimeFilterInfo'>> = {}) {
    const { getEditLensConfiguration, getVisualizationMap, getDatasourceMap } = await import(
      '../../async_services'
    );
    const visualizationMap = getVisualizationMap();
    const datasourceMap = getDatasourceMap();

    const currentState = getState();
    const attributes = currentState.attributes as TypedLensSerializedState['attributes'];
    const activeDatasourceId = (getActiveDatasourceIdFromDoc(attributes) ||
      'formBased') as EditLensConfigurationProps['datasourceId'];

    const { updatePanelState, updateSuggestion } = getStateManagementForInlineEditing(
      activeDatasourceId,
      () => getState().attributes as TypedLensSerializedState['attributes'],
      (attrs: TypedLensSerializedState['attributes'], resetId: boolean = false) => {
        updateState({
          attributes: attrs,
          savedObjectId: resetId ? undefined : currentState.savedObjectId,
        });
      },
      visualizationMap,
      datasourceMap,
      startDependencies.data.query.filterManager.extract
    );

    const updateByRefInput = (savedObjectId: LensRuntimeState['savedObjectId']) => {
      updateState({ attributes, savedObjectId });
    };
    const Component = await getEditLensConfiguration(
      coreStart,
      startDependencies,
      visualizationMap,
      datasourceMap
    );

    if (attributes?.visualizationType == null) {
      return null;
    }
    return (
      <Component
        attributes={attributes}
        updateByRefInput={updateByRefInput}
        updatePanelState={updatePanelState}
        updateSuggestion={updateSuggestion}
        datasourceId={activeDatasourceId}
        lensAdapters={inspectorApi.getInspectorAdapters()}
        dataLoading$={dataLoading$}
        panelId={uuid}
        savedObjectId={currentState.savedObjectId}
        navigateToLensEditor={
          !isTextBasedLanguage(currentState) && navigateToLensEditor
            ? navigateToLensEditor(
                new EmbeddableStateTransfer(
                  coreStart.application.navigateToApp,
                  coreStart.application.currentAppId$
                ),
                true
              )
            : undefined
        }
        displayFlyoutHeader
        canEditTextBasedQuery={isTextBasedLanguage(currentState)}
        isNewPanel={panelManagementApi.isNewPanel()}
        onCancel={() => {
          panelManagementApi.onStopEditing(
            true,
            // DSL/form based charts are created via the full editor, so there's
            // an initial state to preserve. ES|QL charts are created inline, so it needs to pass an empty state
            // and the panelManagementApi will decide whether to remove the panel or not
            isNewlyCreated$.getValue() ? undefined : initialState
          );
          onCancel?.();
        }}
        onApply={(newAttributes) => {
          panelManagementApi.onStopEditing(false, { ...getState(), attributes: newAttributes });
          if (newAttributes.visualizationType != null) {
            onApply?.(newAttributes);
          }
        }}
        hideTimeFilterInfo={hideTimeFilterInfo}
        parentApi={parentApi}
      />
    );
  };
}

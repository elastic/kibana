/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, memo, useCallback } from 'react';
import { EuiForm, euiBreakpoint, useEuiTheme, useEuiOverflowScroll } from '@elastic/eui';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import {
  UPDATE_FILTER_REFERENCES_ACTION,
  UPDATE_FILTER_REFERENCES_TRIGGER,
} from '@kbn/unified-search-plugin/public';

import type { DragDropIdentifier, DropType } from '@kbn/dom-drag-drop';
import { css } from '@emotion/react';
import type { AddLayerFunction, DragDropOperation, Visualization } from '@kbn/lens-common';
import {
  changeIndexPattern,
  onDropToDimension,
  removeDimension,
} from '../../../state_management/lens_slice';
import { LayerPanel } from './layer_panel';
import { generateId } from '../../../id_generator';
import type { ConfigPanelWrapperProps, LayerPanelProps } from './types';
import {
  setLayerDefaultDimension,
  useLensDispatch,
  removeOrClearLayer,
  cloneLayer,
  addLayer as addLayerAction,
  updateDatasourceState,
  updateVisualizationState,
  setToggleFullscreen,
  useLensSelector,
  selectVisualization,
  selectSelectedLayerId,
  registerLibraryAnnotationGroup,
} from '../../../state_management';
import { getRemoveOperation } from '../../../utils';
import { useEditorFrameService } from '../../editor_frame_service_context';
import { LENS_LAYER_TABS_CONTENT_ID } from '../../../app_plugin/shared/edit_on_the_fly/layer_tabs';

export const ConfigPanelWrapper = memo(function ConfigPanelWrapper(props: ConfigPanelWrapperProps) {
  const { visualizationMap } = useEditorFrameService();
  const visualization = useLensSelector(selectVisualization);

  const activeVisualization = visualization.activeId
    ? visualizationMap[visualization.activeId]
    : null;

  return activeVisualization && visualization.state ? (
    <ConfigPanel {...props} activeVisualization={activeVisualization} />
  ) : null;
});

export function ConfigPanel(
  props: ConfigPanelWrapperProps & {
    activeVisualization: Visualization;
  }
) {
  const { datasourceMap } = useEditorFrameService();
  const { activeVisualization, indexPatternService } = props;
  const { activeDatasourceId, visualization, datasourceStates } = useLensSelector(
    (state) => state.lens
  );
  const selectedLayerId = useLensSelector(selectSelectedLayerId);

  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  const dispatchLens = useLensDispatch();

  const layerIds = activeVisualization.getLayerIds(visualization.state);

  const focusLayerTabsContent = () => {
    setTimeout(() => {
      const element = document.getElementById(LENS_LAYER_TABS_CONTENT_ID);
      element?.focus();
    }, 0);
  };

  useEffect(() => {
    if (selectedLayerId) {
      focusLayerTabsContent();
    }
    // Needs layerIds to refocus when layers are removed
  }, [selectedLayerId, layerIds]);

  const setVisualizationState = useMemo(
    () => (newState: unknown) => {
      dispatchLens(
        updateVisualizationState({
          visualizationId: activeVisualization.id,
          newState,
        })
      );
    },
    [activeVisualization.id, dispatchLens]
  );
  const updateDatasource = useMemo(
    () =>
      (datasourceId: string | undefined, newState: unknown, dontSyncLinkedDimensions?: boolean) => {
        if (datasourceId) {
          dispatchLens(
            updateDatasourceState({
              newDatasourceState:
                typeof newState === 'function'
                  ? newState(datasourceStates[datasourceId].state)
                  : newState,
              datasourceId,
              clearStagedPreview: false,
              dontSyncLinkedDimensions,
            })
          );
        }
      },
    [dispatchLens, datasourceStates]
  );
  const updateDatasourceAsync = useMemo(
    () => (datasourceId: string | undefined, newState: unknown) => {
      // React will synchronously update if this is triggered from a third party component,
      // which we don't want. The timeout lets user interaction have priority, then React updates.
      setTimeout(() => {
        updateDatasource(datasourceId, newState);
      });
    },
    [updateDatasource]
  );

  const updateAll = useMemo(
    () =>
      (
        datasourceId: string | undefined,
        newDatasourceState: unknown,
        newVisualizationState: unknown
      ) => {
        if (!datasourceId) return;
        // React will synchronously update if this is triggered from a third party component,
        // which we don't want. The timeout lets user interaction have priority, then React updates.

        setTimeout(() => {
          const newDsState =
            typeof newDatasourceState === 'function'
              ? newDatasourceState(datasourceStates[datasourceId].state)
              : newDatasourceState;

          const newVisState =
            typeof newVisualizationState === 'function'
              ? newVisualizationState(visualization.state)
              : newVisualizationState;

          dispatchLens(
            updateVisualizationState({
              visualizationId: activeVisualization.id,
              newState: newVisState,
              dontSyncLinkedDimensions: true, // TODO: to refactor: this is quite brittle, we avoid to sync linked dimensions because we do it with datasourceState update
            })
          );
          dispatchLens(
            updateDatasourceState({
              newDatasourceState: newDsState,
              datasourceId,
              clearStagedPreview: false,
            })
          );
        }, 0);
      },
    [dispatchLens, visualization.state, datasourceStates, activeVisualization.id]
  );

  const toggleFullscreen = useCallback(() => {
    dispatchLens(setToggleFullscreen());
  }, [dispatchLens]);

  const handleDimensionDrop = useCallback(
    (payload: { source: DragDropIdentifier; target: DragDropOperation; dropType: DropType }) => {
      dispatchLens(onDropToDimension(payload));
    },
    [dispatchLens]
  );

  const onRemoveLayer = useCallback(
    async (layerToRemoveId: string) => {
      const datasourcePublicAPI = props.framePublicAPI.datasourceLayers?.[layerToRemoveId];
      const datasourceId = datasourcePublicAPI?.datasourceId;

      if (datasourceId) {
        const layerDatasource = datasourceMap[datasourceId];
        const layerDatasourceState = datasourceStates?.[datasourceId]?.state;
        const trigger = props.uiActions.getTrigger(UPDATE_FILTER_REFERENCES_TRIGGER);
        const action = await props.uiActions.getAction(UPDATE_FILTER_REFERENCES_ACTION);

        action?.execute({
          trigger,
          fromDataView: layerDatasource.getUsedDataView(layerDatasourceState, layerToRemoveId),
          usedDataViews: layerDatasource
            .getLayers(layerDatasourceState)
            .map((layer) => layerDatasource.getUsedDataView(layerDatasourceState, layer)),
          defaultDataView: layerDatasource.getUsedDataView(layerDatasourceState),
        } as ActionExecutionContext);
      }

      dispatchLens(
        removeOrClearLayer({
          visualizationId: activeVisualization.id,
          layerId: layerToRemoveId,
          layerIds,
        })
      );

      focusLayerTabsContent();
    },
    [
      activeVisualization.id,
      datasourceMap,
      datasourceStates,
      dispatchLens,
      layerIds,
      props.framePublicAPI.datasourceLayers,
      props.uiActions,
    ]
  );

  const onChangeIndexPattern = useCallback(
    async ({
      indexPatternId,
      datasourceId,
      visualizationId,
      layerId,
    }: {
      indexPatternId: string;
      datasourceId?: string;
      visualizationId?: string;
      layerId?: string;
    }) => {
      const indexPatterns = await props.indexPatternService?.ensureIndexPattern({
        id: indexPatternId,
        cache: props.framePublicAPI.dataViews.indexPatterns,
      });
      if (indexPatterns) {
        dispatchLens(
          changeIndexPattern({
            indexPatternId,
            datasourceIds: datasourceId ? [datasourceId] : [],
            visualizationIds: visualizationId ? [visualizationId] : [],
            layerId,
            dataViews: { indexPatterns },
          })
        );
      }
    },
    [dispatchLens, props.framePublicAPI.dataViews.indexPatterns, props.indexPatternService]
  );

  // This will be used only in dimension editors like metric charts which adds a hidden layer.
  // That's why we don't update the currently selected or focused layer.
  const addLayer: AddLayerFunction = useCallback(
    (layerType, extraArg, ignoreInitialValues, seriesType) => {
      const layerId = generateId();
      dispatchLens(
        addLayerAction({ layerId, layerType, extraArg, ignoreInitialValues, seriesType })
      );
    },
    [dispatchLens]
  );

  const registerLibraryAnnotationGroupFunction = useCallback<
    LayerPanelProps['registerLibraryAnnotationGroup']
  >((groupInfo) => dispatchLens(registerLibraryAnnotationGroup(groupInfo)), [dispatchLens]);

  const layerConfig = useMemo(() => {
    if (!selectedLayerId) return;

    return {
      layerId: selectedLayerId,
      layerType: activeVisualization.getLayerType(selectedLayerId, visualization.state),
      config: activeVisualization.getConfiguration({
        layerId: selectedLayerId,
        frame: props.framePublicAPI,
        state: visualization.state,
      }),
    };
  }, [activeVisualization, props.framePublicAPI, selectedLayerId, visualization.state]);

  const euiOverflowScroll = useEuiOverflowScroll('y');

  if (layerConfig?.config.hidden || !selectedLayerId || !layerConfig) return null;

  return (
    <EuiForm
      css={css`
        .lnsApp & {
          padding: ${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.xl}
            calc(400px + ${euiTheme.size.base});
          margin-left: -400px;
          ${euiOverflowScroll}
          ${euiBreakpoint(euiThemeContext, ['xs', 's', 'm'])} {
            padding-left: ${euiTheme.size.base};
            margin-left: 0;
          }
        }
      `}
    >
      <LayerPanel
        {...props}
        onDropToDimension={handleDimensionDrop}
        registerLibraryAnnotationGroup={registerLibraryAnnotationGroupFunction}
        dimensionGroups={layerConfig.config.groups}
        activeVisualization={activeVisualization}
        key={selectedLayerId}
        layerId={selectedLayerId}
        layerIndex={layerIds.indexOf(selectedLayerId)}
        visualizationState={visualization.state}
        updateVisualization={setVisualizationState}
        updateDatasource={updateDatasource}
        updateDatasourceAsync={updateDatasourceAsync}
        displayLayerSettings={!props.hideLayerHeader}
        onChangeIndexPattern={(args) => {
          onChangeIndexPattern(args);
          const layersToRemove =
            activeVisualization.getLayersToRemoveOnIndexPatternChange?.(visualization.state) ?? [];
          layersToRemove.forEach((id) => onRemoveLayer(id));
        }}
        updateAll={updateAll}
        addLayer={addLayer}
        isOnlyLayer={
          getRemoveOperation(
            activeVisualization,
            visualization.state,
            selectedLayerId,
            layerIds.length
          ) === 'clear'
        }
        onEmptyDimensionAdd={(columnId, { groupId }) => {
          // avoid state update if the datasource does not support initializeDimension
          if (
            activeDatasourceId != null &&
            datasourceMap[activeDatasourceId]?.initializeDimension
          ) {
            dispatchLens(
              setLayerDefaultDimension({
                layerId: selectedLayerId,
                columnId,
                groupId,
              })
            );
          }
        }}
        onCloneLayer={() => {
          dispatchLens(
            cloneLayer({
              layerId: selectedLayerId,
            })
          );
        }}
        onRemoveLayer={onRemoveLayer}
        onRemoveDimension={(dimensionProps) => {
          const datasourcePublicAPI = props.framePublicAPI.datasourceLayers?.[selectedLayerId];
          const datasourceId = datasourcePublicAPI?.datasourceId;
          dispatchLens(removeDimension({ ...dimensionProps, datasourceId }));
        }}
        toggleFullscreen={toggleFullscreen}
        indexPatternService={indexPatternService}
      />
    </EuiForm>
  );
}

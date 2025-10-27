/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';

import { isOfAggregateQueryType } from '@kbn/es-query';
import { getLensLayerTypeTabDisplayName } from '@kbn/lens-common';
import type { AddLayerFunction, LayerAction, Visualization } from '@kbn/lens-common';
import {
  UPDATE_FILTER_REFERENCES_ACTION,
  UPDATE_FILTER_REFERENCES_TRIGGER,
} from '@kbn/unified-search-plugin/public';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { TabItem } from '@kbn/unified-tabs';
import { UnifiedTabs, useNewTabProps } from '@kbn/unified-tabs';

import {
  addLayer as addLayerAction,
  changeIndexPattern,
  cloneLayer,
  registerLibraryAnnotationGroup,
  removeOrClearLayer,
  selectSelectedLayerId,
  selectVisualization,
  setSelectedLayerId,
  updateIndexPatterns,
  updateVisualizationState,
  useLensDispatch,
  useLensSelector,
} from '../../../state_management';
import { replaceIndexpattern } from '../../../state_management/lens_slice';
import { useEditorFrameService } from '../../../editor_frame_service/editor_frame_service_context';
import { generateId } from '../../../id_generator';
import type { LayerPanelProps } from '../../../editor_frame_service/editor_frame/config_panel/types';
import { createIndexPatternService } from '../../../data_views_service/service';
import { LayerActions } from '../../../editor_frame_service/editor_frame/config_panel/layer_actions/layer_actions';
import { getSharedActions } from '../../../editor_frame_service/editor_frame/config_panel/layer_actions/layer_actions';
import { getRemoveOperation } from '../../../utils';
import { useFocusUpdate } from '../../../editor_frame_service/editor_frame/config_panel/use_focus_update';

import type { LayerTabsProps } from './types';

export const LayerTabsWrapper = memo(function LayerTabsWrapper(props: LayerTabsProps) {
  const { visualizationMap } = useEditorFrameService();
  const visualization = useLensSelector(selectVisualization);

  const activeVisualization = visualization.activeId
    ? visualizationMap[visualization.activeId]
    : null;

  return activeVisualization && visualization.state ? (
    <LayerTabs {...props} activeVisualization={activeVisualization} />
  ) : null;
});

export function LayerTabs({
  activeVisualization,
  attributes,
  coreStart,
  framePublicAPI,
  setIsInlineFlyoutVisible,
  dataViews,
  uiActions,
}: LayerTabsProps & {
  activeVisualization: Visualization;
}) {
  const { datasourceMap } = useEditorFrameService();
  const { isSaveable, visualization, datasourceStates, query } = useLensSelector(
    (state) => state.lens
  );
  const selectedLayerId = useLensSelector(selectSelectedLayerId);

  const [datasource] = Object.values(framePublicAPI.datasourceLayers);
  const isTextBasedLanguage =
    datasource?.isTextBasedLanguage() || isOfAggregateQueryType(attributes?.state.query) || false;

  const { getNewTabDefaultProps } = useNewTabProps({ numberOfInitialItems: 0 });

  const dispatchLens = useLensDispatch();

  const indexPatternService = useMemo(
    () =>
      createIndexPatternService({
        dataViews,
        uiActions,
        core: coreStart,
        updateIndexPatterns: (newIndexPatternsState, options) => {
          dispatchLens(updateIndexPatterns(newIndexPatternsState));
        },
        replaceIndexPattern: (newIndexPattern, oldId, options) => {
          dispatchLens(replaceIndexpattern({ newIndexPattern, oldId }));
        },
      }),
    [coreStart, dispatchLens, dataViews, uiActions]
  );

  const layerIds = activeVisualization.getLayerIds(visualization.state);

  const addLayer: AddLayerFunction = useCallback(
    (layerType, extraArg, ignoreInitialValues, seriesType) => {
      const layerId = generateId();
      dispatchLens(
        addLayerAction({ layerId, layerType, extraArg, ignoreInitialValues, seriesType })
      );
      dispatchLens(setSelectedLayerId({ layerId }));

      // setNextFocusedLayerId(layerId);
    },
    [dispatchLens]
  );

  const registerLibraryAnnotationGroupFunction = useCallback<
    LayerPanelProps['registerLibraryAnnotationGroup']
  >((groupInfo) => dispatchLens(registerLibraryAnnotationGroup(groupInfo)), [dispatchLens]);

  // if the selected tab got removed, switch back first tab
  useEffect(() => {
    if (selectedLayerId === null || (!layerIds.includes(selectedLayerId) && layerIds.length > 0)) {
      dispatchLens(setSelectedLayerId({ layerId: layerIds[0] }));
    }
  }, [dispatchLens, selectedLayerId, layerIds]);

  const hideAddLayerButton = query && isOfAggregateQueryType(query);

  const layerConfigs = useMemo(() => {
    return layerIds.map((layerId) => ({
      layerId,
      layerType: activeVisualization.getLayerType(layerId, visualization.state),
      config: activeVisualization.getConfiguration({
        layerId,
        frame: framePublicAPI,
        state: visualization.state,
      }),
    }));
  }, [activeVisualization, layerIds, framePublicAPI, visualization.state]);

  // Create layer labels for the tabs
  const layerLabels = useMemo(() => {
    const visibleLayerConfigs = layerConfigs.filter((layer) => !layer.config.hidden);
    const countsByLayerId = new Map<string, number>();
    const typeCounters = new Map<string, number>();
    const layerTabDisplayNames = new Map<string, string>();

    for (const config of visibleLayerConfigs) {
      const layerType = config.layerType || '';
      const currentCount = (typeCounters.get(layerType) || 0) + 1;
      typeCounters.set(layerType, currentCount);
      countsByLayerId.set(config.layerId, currentCount);
    }

    for (const config of visibleLayerConfigs) {
      const layerType = config.layerType || '';
      const typeCount = typeCounters.get(layerType) || 0;
      const formattedLayerType = getLensLayerTypeTabDisplayName(config.layerType);
      const layerCountForId = countsByLayerId.get(config.layerId) || 1;
      const displayName =
        typeCount > 1 ? `${formattedLayerType} ${layerCountForId}` : formattedLayerType;

      layerTabDisplayNames.set(config.layerId, displayName);
    }

    return layerTabDisplayNames;
  }, [layerConfigs]);

  const layerActionsFlyoutRef = useRef<HTMLDivElement | null>(null);

  const { removeRef: removeLayerRef } = useFocusUpdate(layerIds);

  const onRemoveLayer = useCallback(
    async (layerToRemoveId: string) => {
      const datasourcePublicAPI = framePublicAPI.datasourceLayers?.[layerToRemoveId];
      const datasourceId = datasourcePublicAPI?.datasourceId;

      if (datasourceId) {
        const layerDatasource = datasourceMap[datasourceId];
        const layerDatasourceState = datasourceStates?.[datasourceId]?.state;
        const trigger = uiActions.getTrigger(UPDATE_FILTER_REFERENCES_TRIGGER);
        const action = await uiActions.getAction(UPDATE_FILTER_REFERENCES_ACTION);

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

      removeLayerRef(layerToRemoveId);
    },
    [
      activeVisualization.id,
      datasourceMap,
      datasourceStates,
      dispatchLens,
      layerIds,
      framePublicAPI.datasourceLayers,
      uiActions,
      removeLayerRef,
    ]
  );

  const visibleLayerConfigs = useMemo(
    () => layerConfigs.filter((layer) => !layer.config.hidden),
    [layerConfigs]
  );

  const managedItems: TabItem[] = useMemo(() => {
    const updateVisualization = (newState: unknown) => {
      dispatchLens(
        updateVisualizationState({
          visualizationId: activeVisualization.id,
          newState,
        })
      );
    };

    const visualizationState = visualization.state;

    return visibleLayerConfigs.map((layerConfig, layerIndex) => {
      const compatibleActions: LayerAction[] = [
        ...(activeVisualization
          .getSupportedActionsForLayer?.(
            layerConfig.layerId,
            visualizationState,
            updateVisualization,
            registerLibraryAnnotationGroupFunction,
            isSaveable
          )
          .map((action) => ({
            ...action,
            execute: () => {
              action.execute(layerActionsFlyoutRef.current);
            },
          })) || []),

        ...getSharedActions({
          layerId: layerConfig.layerId,
          activeVisualization,
          core: coreStart,
          layerIndex,
          layerType: activeVisualization.getLayerType(layerConfig.layerId, visualizationState),
          isOnlyLayer:
            getRemoveOperation(
              activeVisualization,
              visualization.state,
              selectedLayerId ?? '',
              layerIds.length
            ) === 'clear',
          isTextBasedLanguage,
          onCloneLayer: () => {
            dispatchLens(
              cloneLayer({
                layerId: layerConfig.layerId,
              })
            );
          },
          onRemoveLayer: () => onRemoveLayer(layerConfig.layerId),
          customRemoveModalText: activeVisualization.getCustomRemoveLayerText?.(
            layerConfig.layerId,
            visualizationState
          ),
        }),
      ].filter((i) => i.isCompatible);

      return {
        id: layerConfig.layerId,
        label: layerLabels.get(layerConfig.layerId) || 'Unknown',
        customMenuButton: (
          <LayerActions
            actions={compatibleActions}
            layerIndex={layerIndex}
            mountingPoint={layerActionsFlyoutRef.current}
          />
        ),
      };
    });
  }, [
    activeVisualization,
    coreStart,
    dispatchLens,
    isSaveable,
    isTextBasedLanguage,
    layerIds.length,
    layerLabels,
    onRemoveLayer,
    registerLibraryAnnotationGroupFunction,
    selectedLayerId,
    visibleLayerConfigs,
    visualization,
  ]);

  const addLayerButton = useMemo(() => {
    if (hideAddLayerButton) {
      return null;
    }

    return activeVisualization?.getAddLayerButtonComponent?.({
      state: visualization.state,
      supportedLayers: activeVisualization.getSupportedLayers(visualization.state, framePublicAPI),
      addLayer,
      ensureIndexPattern: async (specOrId) => {
        let indexPatternId;

        if (typeof specOrId === 'string') {
          indexPatternId = specOrId;
        } else {
          const dataView = await dataViews.create(specOrId);

          if (!dataView.id) {
            return;
          }

          indexPatternId = dataView.id;
        }

        const newIndexPatterns = await indexPatternService?.ensureIndexPattern({
          id: indexPatternId,
          cache: framePublicAPI.dataViews.indexPatterns,
        });

        if (newIndexPatterns) {
          dispatchLens(
            changeIndexPattern({
              dataViews: { indexPatterns: newIndexPatterns },
              datasourceIds: Object.keys(datasourceStates),
              visualizationIds: visualization.activeId ? [visualization.activeId] : [],
              indexPatternId,
            })
          );
        }
      },
      registerLibraryAnnotationGroup: registerLibraryAnnotationGroupFunction,
      isInlineEditing: Boolean(setIsInlineFlyoutVisible),
    });
  }, [
    activeVisualization,
    addLayer,
    datasourceStates,
    dispatchLens,
    hideAddLayerButton,
    indexPatternService,
    dataViews,
    framePublicAPI,
    setIsInlineFlyoutVisible,
    registerLibraryAnnotationGroupFunction,
    visualization.activeId,
    visualization.state,
  ]);

  return !hideAddLayerButton ? (
    <>
      <UnifiedTabs
        items={managedItems}
        selectedItemId={selectedLayerId ?? undefined}
        recentlyClosedItems={[]}
        onClearRecentlyClosed={() => {}}
        maxItemsCount={25}
        services={{
          core: { chrome: coreStart.chrome },
        }}
        onChanged={(updatedState) => {
          // Create a set of the updated item ids for easy lookup
          const updatedItemIds = new Set(updatedState.items.map((item) => item.id));

          // Handle removed layers
          managedItems
            .filter((item) => !updatedItemIds.has(item.id))
            .forEach((item) => {
              onRemoveLayer(item.id);
            });

          // Update selected layer
          dispatchLens(setSelectedLayerId({ layerId: updatedState.selectedItem?.id ?? null }));
        }}
        createItem={getNewTabDefaultProps}
        onEBTEvent={() => {}}
        customNewTabButton={addLayerButton || undefined}
        disableInlineLabelEditing
        disablePreview
        disableDragAndDrop
        disableTabsBarMenu
        disableCloseButton
      />
      <div ref={layerActionsFlyoutRef} />
    </>
  ) : null;
}

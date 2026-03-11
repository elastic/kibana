/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { css } from '@emotion/react';

import { useEuiTheme } from '@elastic/eui';

import { isOfAggregateQueryType } from '@kbn/es-query';
import type { LayerAction, Visualization } from '@kbn/lens-common';
import { UPDATE_FILTER_REFERENCES_ACTION } from '@kbn/unified-search-plugin/public';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { TabItem } from '@kbn/unified-tabs';
import { UnifiedTabs } from '@kbn/unified-tabs';

import { UPDATE_FILTER_REFERENCES_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import {
  cloneLayer,
  registerLibraryAnnotationGroup,
  removeOrClearLayer,
  selectSelectedLayerId,
  selectVisualization,
  setSelectedLayerId,
  updateVisualizationState,
  useLensDispatch,
  useLensSelector,
} from '../../../state_management';
import { useEditorFrameService } from '../../../editor_frame_service/editor_frame_service_context';
import type { LayerPanelProps } from '../../../editor_frame_service/editor_frame/config_panel/types';
import { LayerActions } from '../../../editor_frame_service/editor_frame/config_panel/layer_actions/layer_actions';
import { getSharedActions } from '../../../editor_frame_service/editor_frame/config_panel/layer_actions/layer_actions';
import { getRemoveOperation } from '../../../utils';

import type { LayerTabsProps } from './types';
import { useGetLayerTabsLabel } from './use_layer_tabs_labels';

export const LENS_LAYER_TABS_CONTENT_ID = 'lnsLayerTabsContent';

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
  uiActions,
}: LayerTabsProps & {
  activeVisualization: Visualization;
}) {
  const { euiTheme } = useEuiTheme();
  const { datasourceMap } = useEditorFrameService();
  const { isSaveable, visualization, datasourceStates } = useLensSelector((state) => state.lens);
  const selectedLayerId = useLensSelector(selectSelectedLayerId);

  const [datasource] = Object.values(framePublicAPI.datasourceLayers);
  const isTextBasedLanguage =
    datasource?.isTextBasedLanguage() || isOfAggregateQueryType(attributes?.state.query) || false;

  const dispatchLens = useLensDispatch();

  const layerIds = activeVisualization.getLayerIds(visualization.state);

  const registerLibraryAnnotationGroupFunction = useCallback<
    LayerPanelProps['registerLibraryAnnotationGroup']
  >((groupInfo) => dispatchLens(registerLibraryAnnotationGroup(groupInfo)), [dispatchLens]);

  // if the selected tab got removed, switch back first tab
  useEffect(() => {
    if (selectedLayerId === null || (!layerIds.includes(selectedLayerId) && layerIds.length > 0)) {
      dispatchLens(setSelectedLayerId({ layerId: layerIds[0] }));
    }
  }, [dispatchLens, selectedLayerId, layerIds]);

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
  const getLayerTabsLabel = useGetLayerTabsLabel(layerConfigs);

  const layerActionsFlyoutRef = useRef<HTMLDivElement | null>(null);

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
    },
    [
      activeVisualization.id,
      datasourceMap,
      datasourceStates,
      dispatchLens,
      layerIds,
      framePublicAPI.datasourceLayers,
      uiActions,
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
              layerConfig.layerId,
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
        label: getLayerTabsLabel(layerConfig.layerId),
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
    getLayerTabsLabel,
    onRemoveLayer,
    registerLibraryAnnotationGroupFunction,
    visibleLayerConfigs,
    visualization,
  ]);

  return (
    <div
      css={css`
        pointer-events: auto;
        background-color: ${euiTheme.colors.emptyShade};
      `}
    >
      {managedItems.length > 1 ? (
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
          onEBTEvent={() => {}}
          // we render the custom "Add layer" button in the flyout header toolbar
          customNewTabButton={<></>}
          createItem={() => ({ id: '', label: '' })}
          tabContentIdOverride={LENS_LAYER_TABS_CONTENT_ID}
          disableInlineLabelEditing
          disableDragAndDrop
          disableTabsBarMenu
          disableCloseButton
        />
      ) : null}
      <div ref={layerActionsFlyoutRef} />
    </div>
  );
}

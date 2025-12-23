/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { partition } from 'lodash';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';

import { isOfAggregateQueryType } from '@kbn/es-query';
import type { FormBasedLayer, LayerAction, Visualization } from '@kbn/lens-common';
import {
  UPDATE_FILTER_REFERENCES_ACTION,
  UPDATE_FILTER_REFERENCES_TRIGGER,
} from '@kbn/unified-search-plugin/public';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { TabItem } from '@kbn/unified-tabs';
import { UnifiedTabs } from '@kbn/unified-tabs';

import { operationDefinitionMap } from '../../../datasources/form_based/operations';
import { getESQLForLayer } from '../../../datasources/form_based/to_esql';
import {
  cloneLayer,
  registerLibraryAnnotationGroup,
  removeOrClearLayer,
  selectSelectedLayerId,
  selectResolvedDateRange,
  selectVisualization,
  setSelectedLayerId,
  updateDatasourceState,
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
  const dateRange = useLensSelector(selectResolvedDateRange);

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
        // Convert to ES|QL action - only for data layers that aren't already ES|QL
        ...(layerConfig.layerType === 'data'
          ? [
              {
                execute: () => {
                  const datasourcePublicAPI =
                    framePublicAPI.datasourceLayers?.[layerConfig.layerId];
                  const datasourceId = datasourcePublicAPI?.datasourceId;

                  if (!datasourceId) return;

                  const layerDatasourceState = datasourceStates?.[datasourceId]?.state;
                  if (!layerDatasourceState) return;

                  // Check if layer is already ES|QL
                  if (layerDatasourceState.layers[layerConfig.layerId]?.query) return;

                  const layer = layerDatasourceState.layers[layerConfig.layerId] as FormBasedLayer;
                  if (!layer || !layer.columnOrder || !layer.columns) return;

                  // Get the index pattern
                  const indexPattern = framePublicAPI.dataViews.indexPatterns[layer.indexPatternId];
                  if (!indexPattern) return;

                  // Partition columns to get esAggEntries (exclude fullReference and managedReference)
                  const { columnOrder } = layer;
                  const columns = { ...layer.columns };
                  const columnEntries = columnOrder.map(
                    (colId) => [colId, columns[colId]] as const
                  );
                  const [, esAggEntries] = partition(
                    columnEntries,
                    ([, col]) =>
                      operationDefinitionMap[col.operationType]?.input === 'fullReference' ||
                      operationDefinitionMap[col.operationType]?.input === 'managedReference'
                  );

                  // Call getESQLForLayer to get the conversion result
                  const esqlResult = getESQLForLayer(
                    esAggEntries,
                    layer,
                    indexPattern,
                    coreStart.uiSettings,
                    dateRange,
                    new Date()
                  );

                  if (!esqlResult) return;

                  const newColumns = Object.keys(esqlResult.esAggsIdMap).map((key) => {
                    return {
                      ...esqlResult.esAggsIdMap[key][0],
                      columnId: esqlResult.esAggsIdMap[key][0].id,
                      fieldName: key,
                      meta: {
                        type: esqlResult.esAggsIdMap[key][0].dataType,
                        label: esqlResult.esAggsIdMap[key][0].label,
                      },
                    };
                  });

                  const newState = {
                    ...layerDatasourceState,
                    layers: {
                      ...layerDatasourceState.layers,
                      [layerConfig.layerId]: {
                        indexPatternId: layer.indexPatternId,
                        linkToLayers: [],
                        columns: newColumns,
                        columnOrder: [],
                        sampling: 1,
                        ignoreGlobalFilters: false,
                        query: {
                          esql: esqlResult.esql,
                        },
                      },
                    },
                  };

                  dispatchLens(
                    updateDatasourceState({ newDatasourceState: newState, datasourceId })
                  );
                },
                displayName: i18n.translate('xpack.lens.convert', {
                  defaultMessage: 'Convert to ES|QL',
                }),
                icon: 'sortUp',
                'data-test-subj': 'lnsConvertLayer',
                order: -1, // Show before other actions
                isCompatible: true,
              },
            ]
          : []),
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
    dateRange,
    datasourceStates,
    dispatchLens,
    framePublicAPI,
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

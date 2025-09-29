/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';

import { EuiTabs, EuiTab, EuiSpacer, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';

import { isOfAggregateQueryType } from '@kbn/es-query';
import { getLensLayerTypeDisplayName } from '@kbn/lens-common';
import type { AddLayerFunction, Visualization } from '@kbn/lens-common';

import {
  addLayer as addLayerAction,
  changeIndexPattern,
  registerLibraryAnnotationGroup,
  selectSelectedLayerId,
  selectVisualization,
  setSelectedLayerId,
  updateIndexPatterns,
  useLensDispatch,
  useLensSelector,
} from '../../../state_management';
import { replaceIndexpattern } from '../../../state_management/lens_slice';
import { generateId } from '../../../id_generator';
import type { LayerPanelProps } from '../../../editor_frame_service/editor_frame/config_panel/types';
import { createIndexPatternService } from '../../../data_views_service/service';
import { useEditorFrameService } from '../../../editor_frame_service/editor_frame_service_context';

import type { LayerConfigurationProps } from './types';

export const LayerTabsWrapper = memo(function LayerTabsWrapper(props: LayerConfigurationProps) {
  const { visualizationMap } = useEditorFrameService();
  const visualization = useLensSelector(selectVisualization);

  const activeVisualization = visualization.activeId
    ? visualizationMap[visualization.activeId]
    : null;

  return activeVisualization && visualization.state ? (
    <LayerTabs {...props} activeVisualization={activeVisualization} />
  ) : null;
});

export function LayerTabs(
  props: LayerConfigurationProps & {
    activeVisualization: Visualization;
  }
) {
  const { activeVisualization, coreStart, startDependencies } = props;
  const { euiTheme } = useEuiTheme();

  const { visualization, datasourceStates, query } = useLensSelector((state) => state.lens);
  const selectedLayerId = useLensSelector(selectSelectedLayerId);

  const dispatchLens = useLensDispatch();

  const indexPatternService = useMemo(
    () =>
      createIndexPatternService({
        dataViews: startDependencies.dataViews,
        uiActions: startDependencies.uiActions,
        core: coreStart,
        updateIndexPatterns: (newIndexPatternsState, options) => {
          dispatchLens(updateIndexPatterns(newIndexPatternsState));
        },
        replaceIndexPattern: (newIndexPattern, oldId, options) => {
          dispatchLens(replaceIndexpattern({ newIndexPattern, oldId }));
        },
      }),
    [coreStart, dispatchLens, startDependencies.dataViews, startDependencies.uiActions]
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

  const hideAddLayerButton = query && isOfAggregateQueryType(query);

  const onSelectedTabChanged = useCallback(
    (layerId: string) => {
      dispatchLens(setSelectedLayerId({ layerId }));
    },
    [dispatchLens]
  );

  const layerConfigs = useMemo(() => {
    return layerIds.map((layerId) => ({
      layerId,
      layerType: activeVisualization.getLayerType(layerId, visualization.state),
      config: activeVisualization.getConfiguration({
        layerId,
        frame: props.framePublicAPI,
        state: visualization.state,
      }),
    }));
  }, [activeVisualization, layerIds, props.framePublicAPI, visualization.state]);

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
      const formattedLayerType = getLensLayerTypeDisplayName(config.layerType);
      const layerCountForId = countsByLayerId.get(config.layerId) || 1;
      const displayName =
        typeCount > 1 ? `${formattedLayerType} ${layerCountForId}` : formattedLayerType;

      layerTabDisplayNames.set(config.layerId, displayName);
    }

    return layerTabDisplayNames;
  }, [layerConfigs]);

  const renderTabs = useCallback(() => {
    const visibleLayerConfigs = layerConfigs.filter((layer) => !layer.config.hidden);

    const layerTabs = visibleLayerConfigs.map((layerConfig, layerIndex) => {
      return (
        <EuiTab
          key={layerIndex}
          onClick={() => onSelectedTabChanged(layerConfig.layerId)}
          isSelected={layerConfig.layerId === selectedLayerId}
          disabled={false}
          data-test-subj={`lnsLayerTab-${layerConfig.layerId}`}
        >
          {layerLabels.get(layerConfig.layerId)}
        </EuiTab>
      );
    });

    return layerTabs;
  }, [layerConfigs, layerLabels, onSelectedTabChanged, selectedLayerId]);

  const addLayerButton = useMemo(() => {
    if (hideAddLayerButton) {
      return null;
    }

    return activeVisualization?.getAddLayerButtonComponent?.({
      state: visualization.state,
      supportedLayers: activeVisualization.getSupportedLayers(
        visualization.state,
        props.framePublicAPI
      ),
      addLayer,
      ensureIndexPattern: async (specOrId) => {
        let indexPatternId;

        if (typeof specOrId === 'string') {
          indexPatternId = specOrId;
        } else {
          const dataView = await props.startDependencies.dataViews.create(specOrId);

          if (!dataView.id) {
            return;
          }

          indexPatternId = dataView.id;
        }

        const newIndexPatterns = await indexPatternService?.ensureIndexPattern({
          id: indexPatternId,
          cache: props.framePublicAPI.dataViews.indexPatterns,
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
      isInlineEditing: Boolean(props?.setIsInlineFlyoutVisible),
    });
  }, [
    activeVisualization,
    addLayer,
    datasourceStates,
    dispatchLens,
    hideAddLayerButton,
    indexPatternService,
    props.startDependencies.dataViews,
    props.framePublicAPI,
    props?.setIsInlineFlyoutVisible,
    registerLibraryAnnotationGroupFunction,
    visualization.activeId,
    visualization.state,
  ]);

  /**
   * Render layer tabs only if the chart type supports multiple layers.
   *
   * Layout behavior:
   * - Tabs take only the space they need (grow={false})
   * - Button stays next to tabs when space available
   * - When tabs overflow, they get hidden while button remains visible
   *
   * Normal state (few tabs):
   * ┌─────────────────────────────────────────────┐
   * │ [Tab1] [Tab2] [Tab3] [+]                    │
   * └─────────────────────────────────────────────┘
   *
   * Overflow state (many tabs):
   * ┌─────────────────────────────────────────────┐
   * │ [Tab1] [Tab2] [Tab3] [Tab4] [Tab5] [T... [+]│
   * └─────────────────────────────────────────────┘
   * Hidden tabs are still accessible via horizontal scroll.
   */
  return !hideAddLayerButton ? (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="center" css={{ padding: `0 ${euiTheme.size.base}` }}>
        <EuiFlexItem grow={false} style={{ overflow: 'hidden', minWidth: 0 }}>
          <EuiTabs bottomBorder={false}>{renderTabs()}</EuiTabs>
        </EuiFlexItem>
        {addLayerButton && <EuiFlexItem grow={true}>{addLayerButton}</EuiFlexItem>}
      </EuiFlexGroup>
    </>
  ) : null;
}

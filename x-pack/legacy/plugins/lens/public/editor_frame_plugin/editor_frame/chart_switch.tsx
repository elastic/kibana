/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiIcon,
  EuiPopover,
  EuiButton,
  EuiPopoverTitle,
  EuiKeyPadMenu,
  EuiKeyPadMenuItemButton,
} from '@elastic/eui';
import { flatten } from 'lodash';
import { i18n } from '@kbn/i18n';
import { Visualization, FramePublicAPI } from '../../types';
import { Action } from './state_management';

interface VisualizationSelection {
  visualizationId: string;
  subVisualizationId: string;
  getVisualizationState: () => unknown;
  keptLayerId: string;
  dataLoss: 'nothing' | 'layers' | 'everything';
}

interface Props {
  dispatch: (action: Action) => void;
  visualizationMap: Record<string, Visualization>;
  visualizationId: string | null;
  visualizationState: unknown;
  framePublicAPI: FramePublicAPI;
}

function dropUnusedLayers(frame: FramePublicAPI, layerId: string) {
  // Remove any layers that are not used by the new visualization. If we don't do this,
  // we get orphaned objects, and weird edge cases such as prompting the user that
  // layers are going to be dropped, when the user is unaware of any extraneous layers.
  const layerIds = Object.keys(frame.datasourceLayers).filter(id => {
    return id !== layerId;
  });
  frame.removeLayers(layerIds);
}

function VisualizationSummary(props: Props) {
  const visualization = props.visualizationMap[props.visualizationId || ''];

  if (!visualization) {
    return (
      <>
        {i18n.translate('xpack.lens.configPanel.chooseVisualization', {
          defaultMessage: 'Choose a visualization',
        })}
      </>
    );
  }

  const description = visualization.getDescription(props.visualizationState);

  return (
    <>
      {description.icon && <EuiIcon type={description.icon} />}
      {description.label}
    </>
  );
}

export function ChartSwitch(props: Props) {
  const [flyoutOpen, setFlyoutOpen] = useState<boolean>(false);

  const commitSelection = (selection: VisualizationSelection) => {
    setFlyoutOpen(false);

    if (selection.dataLoss === 'everything' || selection.dataLoss === 'layers') {
      dropUnusedLayers(props.framePublicAPI, selection.keptLayerId);
    }

    if (selection.visualizationId !== props.visualizationId) {
      props.dispatch({
        type: 'SWITCH_VISUALIZATION',
        newVisualizationId: selection.visualizationId,
        initialState: selection.getVisualizationState(),
      });
    } else {
      props.dispatch({
        type: 'UPDATE_VISUALIZATION_STATE',
        newState: selection.getVisualizationState(),
      });
    }
  };

  function getSelection(
    visualizationId: string,
    subVisualizationId: string
  ): VisualizationSelection {
    const newVisualization = props.visualizationMap[visualizationId];
    const switchVisType =
      props.visualizationMap[visualizationId].switchVisualizationType ||
      ((_type: string, initialState: unknown) => initialState);
    if (props.visualizationId === visualizationId) {
      return {
        visualizationId,
        subVisualizationId,
        dataLoss: 'nothing',
        keptLayerId: '',
        getVisualizationState: () => switchVisType(subVisualizationId, props.visualizationState),
      };
    }

    const layers = Object.entries(props.framePublicAPI.datasourceLayers);
    const containsData = layers.some(
      ([_layerId, datasource]) => datasource.getTableSpec().length > 0
    );

    // get top ranked suggestion for all layers of current state
    const topSuggestion = newVisualization
      .getSuggestions({
        tables: layers.map(([layerId, datasource], index) => ({
          datasourceSuggestionId: index,
          isMultiRow: true,
          columns: datasource.getTableSpec().map(col => ({
            ...col,
            operation: datasource.getOperationForColumnId(col.columnId)!,
          })),
          layerId,
        })),
      })
      .map(suggestion => ({ suggestion, layerId: layers[suggestion.datasourceSuggestionId][0] }))
      .sort(
        ({ suggestion: { score: scoreA } }, { suggestion: { score: scoreB } }) => scoreB - scoreA
      )[0];

    let dataLoss: VisualizationSelection['dataLoss'] = 'nothing';

    if (!topSuggestion && containsData) {
      dataLoss = 'everything';
    } else if (layers.length > 1 && containsData) {
      dataLoss = 'layers';
    }

    return {
      visualizationId,
      subVisualizationId,
      dataLoss,
      getVisualizationState: topSuggestion
        ? () =>
            switchVisType(
              subVisualizationId,
              newVisualization.initialize(props.framePublicAPI, topSuggestion.suggestion.state)
            )
        : () => {
            return switchVisType(
              subVisualizationId,
              newVisualization.initialize(props.framePublicAPI)
            );
          },
      keptLayerId: topSuggestion ? topSuggestion.layerId : '',
    };
  }

  const visualizationTypes = useMemo(
    () =>
      flyoutOpen &&
      flatten(
        Object.values(props.visualizationMap).map(v =>
          v.visualizationTypes.map(t => ({
            visualizationId: v.id,
            ...t,
          }))
        )
      ).map(visualizationType => ({
        ...visualizationType,
        selection: getSelection(visualizationType.visualizationId, visualizationType.id),
      })),
    [
      flyoutOpen,
      props.visualizationMap,
      props.framePublicAPI,
      props.visualizationId,
      props.visualizationState,
    ]
  );

  return (
    <>
      <EuiPopover
        id="lnsChartSwitchPopover"
        ownFocus
        button={
          <EuiButton
            iconType="arrowDown"
            iconSide="right"
            onClick={() => setFlyoutOpen(!flyoutOpen)}
            data-test-subj="lnsChartSwitchPopover"
          >
            <VisualizationSummary {...props} />
          </EuiButton>
        }
        isOpen={flyoutOpen}
        closePopover={() => setFlyoutOpen(false)}
        anchorPosition="leftUp"
      >
        <EuiPopoverTitle>
          {i18n.translate('xpack.lens.configPanel.chooseVisualization', {
            defaultMessage: 'Choose a visualization',
          })}
        </EuiPopoverTitle>
        <EuiKeyPadMenu>
          {(visualizationTypes || []).map(v => (
            <EuiKeyPadMenuItemButton
              key={`${v.visualizationId}:${v.id}`}
              label={<span data-test-subj="visTypeTitle">{v.label}</span>}
              role="menuitem"
              data-test-subj={`lnsChartSwitchPopover_${v.id}`}
              onClick={() => commitSelection(v.selection)}
              betaBadgeLabel={
                v.selection.dataLoss !== 'nothing'
                  ? i18n.translate('xpack.lens.chartSwitch.dataLossLabel', {
                      defaultMessage: 'Data loss',
                    })
                  : undefined
              }
              betaBadgeTooltipContent={
                v.selection.dataLoss !== 'nothing'
                  ? i18n.translate('xpack.lens.chartSwitch.dataLossDescription', {
                      defaultMessage: 'Switching to this chart will lose some of the configuration',
                    })
                  : undefined
              }
              betaBadgeIconType={v.selection.dataLoss !== 'nothing' ? 'bolt' : undefined}
            >
              <EuiIcon type={v.icon || 'empty'} />
            </EuiKeyPadMenuItemButton>
          ))}
        </EuiKeyPadMenu>
      </EuiPopover>
    </>
  );
}

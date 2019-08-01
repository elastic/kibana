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
import { Visualization, FramePublicAPI, Datasource } from '../../types';
import { Action } from './state_management';
import { getSuggestions } from './suggestion_helpers';

interface VisualizationSelection {
  visualizationId: string;
  subVisualizationId: string;
  getVisualizationState: () => unknown;
  keptLayerId: string;
  dataLoss: 'nothing' | 'layers' | 'everything' | 'columns';
  datasourceId?: string;
  datasourceState?: unknown;
}

interface Props {
  dispatch: (action: Action) => void;
  visualizationMap: Record<string, Visualization>;
  visualizationId: string | null;
  visualizationState: unknown;
  framePublicAPI: FramePublicAPI;
  datasourceMap: Record<string, Datasource>;
  datasourceStates: Record<
    string,
    {
      isLoading: boolean;
      state: unknown;
    }
  >;
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

    if (selection.dataLoss !== 'nothing') {
      dropUnusedLayers(props.framePublicAPI, selection.keptLayerId);
    }

    if (selection.visualizationId !== props.visualizationId) {
      props.dispatch({
        type: 'SWITCH_VISUALIZATION',
        newVisualizationId: selection.visualizationId,
        initialState: selection.getVisualizationState(),
        datasourceState: selection.datasourceState,
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

    const datasourceSuggestions = _.flatten(
      Object.entries(props.datasourceMap).map(([datasourceId, datasource]) => {
        if (props.datasourceStates[datasourceId] && !props.datasourceStates.isLoading) {
          return datasource
            .getDatasourceSuggestionsFromCurrentState(props.datasourceStates[datasourceId])
            // TODO have the datasource in there by default
            .map(suggestion => ({ ...suggestion, datasourceId }));
        } else {
          return [];
        }
      })
    ).map((suggestion, index) => ({
      ...suggestion,
      table: { ...suggestion.table, datasourceSuggestionId: index },
    }));

    const topSuggestion = getSuggestions(
      datasourceSuggestions,
      { [visualizationId]: newVisualization },
      props.visualizationId,
      props.visualizationState
    )[0];

    let dataLoss: VisualizationSelection['dataLoss'];

    if (!containsData) {
      dataLoss = 'nothing';
    } else if (!topSuggestion) {
      dataLoss = 'everything';
    } else if (layers.length > 1) {
      dataLoss = 'layers';
    } else if (
      topSuggestion.datasourceSuggestion.table.columns.length !== layers[0][1].getTableSpec().length
    ) {
      dataLoss = 'columns';
    } else {
      dataLoss = 'nothing';
    }

    return {
      visualizationId,
      subVisualizationId,
      dataLoss,
      getVisualizationState: topSuggestion
        ? () =>
            switchVisType(
              subVisualizationId,
              newVisualization.initialize(props.framePublicAPI, topSuggestion.state)
            )
        : () => {
            return switchVisType(
              subVisualizationId,
              newVisualization.initialize(props.framePublicAPI)
            );
          },
      keptLayerId: topSuggestion ? topSuggestion.datasourceSuggestion.table.layerId : '',
      datasourceState: topSuggestion ? topSuggestion.datasourceSuggestion.state : undefined,
      datasourceId: topSuggestion
        ? datasourceSuggestions[topSuggestion.datasourceSuggestion.table.datasourceSuggestionId]
            .datasourceId
        : undefined,
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
        initialFocus=".lnsChartSwitchPopoverPanel"
        panelClassName="lnsChartSwitchPopoverPanel"
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

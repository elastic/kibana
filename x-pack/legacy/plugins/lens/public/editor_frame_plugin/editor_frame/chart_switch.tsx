/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiKeyPadMenu,
  EuiKeyPadMenuItemButton,
  EuiButtonEmpty,
  EuiTitle,
} from '@elastic/eui';
import { flatten } from 'lodash';
import { i18n } from '@kbn/i18n';
import { Visualization, FramePublicAPI, Datasource } from '../../types';
import { Action } from './state_management';
import { getSuggestions, switchToSuggestion, Suggestion } from './suggestion_helpers';

interface VisualizationSelection {
  visualizationId: string;
  subVisualizationId: string;
  getVisualizationState: () => unknown;
  keptLayerIds: string[];
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
      {description.icon && (
        <EuiIcon className="lnsChartSwitch__summaryIcon" type={description.icon} />
      )}
      {description.label}
    </>
  );
}

export function ChartSwitch(props: Props) {
  const [flyoutOpen, setFlyoutOpen] = useState<boolean>(false);

  const commitSelection = (selection: VisualizationSelection) => {
    setFlyoutOpen(false);

    switchToSuggestion(
      props.framePublicAPI,
      props.dispatch,
      {
        ...selection,
        visualizationState: selection.getVisualizationState(),
      },
      'SWITCH_VISUALIZATION'
    );
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
        keptLayerIds: Object.keys(props.framePublicAPI.datasourceLayers),
        getVisualizationState: () => switchVisType(subVisualizationId, props.visualizationState),
      };
    }

    const layers = Object.entries(props.framePublicAPI.datasourceLayers);
    const containsData = layers.some(
      ([_layerId, datasource]) => datasource.getTableSpec().length > 0
    );

    const topSuggestion = getTopSuggestion(props, visualizationId, newVisualization);

    let dataLoss: VisualizationSelection['dataLoss'];

    if (!containsData) {
      dataLoss = 'nothing';
    } else if (!topSuggestion) {
      dataLoss = 'everything';
    } else if (layers.length > 1) {
      dataLoss = 'layers';
    } else if (topSuggestion.columns !== layers[0][1].getTableSpec().length) {
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
              newVisualization.initialize(props.framePublicAPI, topSuggestion.visualizationState)
            )
        : () => {
            return switchVisType(
              subVisualizationId,
              newVisualization.initialize(props.framePublicAPI)
            );
          },
      keptLayerIds: topSuggestion ? topSuggestion.keptLayerIds : [],
      datasourceState: topSuggestion ? topSuggestion.datasourceState : undefined,
      datasourceId: topSuggestion ? topSuggestion.datasourceId : undefined,
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

  const popover = (
    <EuiPopover
      id="lnsChartSwitchPopover"
      ownFocus
      initialFocus=".lnsChartSwitch__popoverPanel"
      panelClassName="lnsChartSwitch__popoverPanel"
      panelPaddingSize="s"
      button={
        <EuiButtonEmpty
          size="xs"
          onClick={() => setFlyoutOpen(!flyoutOpen)}
          data-test-subj="lnsChartSwitchPopover"
        >
          (
          {i18n.translate('xpack.lens.configPanel.changeVisualization', {
            defaultMessage: 'change',
          })}
          )
        </EuiButtonEmpty>
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
            betaBadgeIconType={v.selection.dataLoss !== 'nothing' ? 'alert' : undefined}
          >
            <EuiIcon type={v.icon || 'empty'} size="l" />
          </EuiKeyPadMenuItemButton>
        ))}
      </EuiKeyPadMenu>
    </EuiPopover>
  );

  return (
    <div className="lnsChartSwitch__header">
      <EuiTitle size="xs">
        <h3>
          <VisualizationSummary {...props} /> {popover}
        </h3>
      </EuiTitle>
    </div>
  );
}

function getTopSuggestion(
  props: Props,
  visualizationId: string,
  newVisualization: Visualization<unknown, unknown>
): Suggestion | undefined {
  const suggestions = getSuggestions({
    datasourceMap: props.datasourceMap,
    datasourceStates: props.datasourceStates,
    visualizationMap: { [visualizationId]: newVisualization },
    activeVisualizationId: props.visualizationId,
    visualizationState: props.visualizationState,
  }).filter(suggestion => {
    // don't use extended versions of current data table on switching between visualizations
    // to avoid confusing the user.
    return suggestion.changeType !== 'extended';
  });

  // We prefer unchanged or reduced suggestions when switching
  // charts since that allows you to switch from A to B and back
  // to A with the greatest chance of preserving your original state.
  return (
    suggestions.find(s => s.changeType === 'unchanged') ||
    suggestions.find(s => s.changeType === 'reduced') ||
    suggestions[0]
  );
}

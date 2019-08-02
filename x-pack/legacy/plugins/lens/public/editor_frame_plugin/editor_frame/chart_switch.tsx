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
import { getSuggestions, switchToSuggestion } from './suggestion_helpers';

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

    if (selection.visualizationId !== props.visualizationId) {
      switchToSuggestion(props.framePublicAPI, props.dispatch, {
        ...selection,
        visualizationState: selection.getVisualizationState(),
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

    const topSuggestion = getSuggestions({
      datasourceMap: props.datasourceMap,
      datasourceStates: props.datasourceStates,
      visualizationMap: { [visualizationId]: newVisualization },
      activeVisualizationId: props.visualizationId,
      visualizationState: props.visualizationState,
    })[0];

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
      keptLayerId: topSuggestion ? topSuggestion.keptLayerId : layers[0][0],
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

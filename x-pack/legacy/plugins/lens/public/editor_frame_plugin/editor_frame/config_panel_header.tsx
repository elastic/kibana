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
  EuiOverlayMask,
  EuiConfirmModal,
} from '@elastic/eui';
import { flatten } from 'lodash';
import { i18n } from '@kbn/i18n';
import { NativeRenderer } from '../../native_renderer';
import { Visualization, FramePublicAPI } from '../../types';
import { Action } from './state_management';

interface VisualizationSelection {
  visualizationId: string;
  subVisualizationId: string;
}

interface State {
  isFlyoutOpen: boolean;
  confirmVisualization?: VisualizationSelection;
}

interface Props {
  dispatch: (action: Action) => void;
  visualizationMap: Record<string, Visualization>;
  visualizationId: string | null;
  visualizationState: unknown;
  framePublicAPI: FramePublicAPI;
}

function getSuggestion(frame: FramePublicAPI, visualization: Visualization) {
  const layers = Object.entries(frame.datasourceLayers);

  if (!layers.length) {
    return {
      suggestion: undefined,
      layerId: undefined,
    };
  }

  const [[layerId, datasource]] = layers;
  const suggestions = visualization.getSuggestions({
    tables: [
      {
        datasourceSuggestionId: 0,
        isMultiRow: true,
        columns: datasource.getTableSpec().map(col => ({
          ...col,
          operation: datasource.getOperationForColumnId(col.columnId)!,
        })),
        layerId,
      },
    ],
  });

  const suggestion = suggestions.length ? suggestions[0] : undefined;
  return { layerId, suggestion };
}

function dropUnusedLayers(frame: FramePublicAPI, suggestion: unknown, layerId?: string) {
  // Remove any layers that are not used by the new visualization. If we don't do this,
  // we get orphaned objects, and weird edge cases such as prompting the user that
  // layers are going to be dropped, when the user is unaware of any extraneous layers.
  Object.keys(frame.datasourceLayers).forEach(id => {
    if (!suggestion || id !== layerId) {
      frame.removeLayer(id);
    }
  });
}

function willLoseAllLayers(frame: FramePublicAPI, visualization: Visualization) {
  return !getSuggestion(frame, visualization).layerId;
}

function getNewVisualizationState(frame: FramePublicAPI, visualization: Visualization) {
  const { suggestion, layerId } = getSuggestion(frame, visualization);

  dropUnusedLayers(frame, suggestion, layerId);

  return visualization.initialize(frame, suggestion && suggestion.state);
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

  return (
    <NativeRenderer
      render={visualization.renderDescription}
      nativeProps={props.visualizationState}
    />
  );
}

function ConfirmationModal({
  onCancel,
  onConfirm,
  selection,
  visualizationMap,
  frame,
}: {
  frame: FramePublicAPI;
  selection: VisualizationSelection;
  visualizationMap: Record<string, Visualization>;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const visualization = visualizationMap[selection.visualizationId];
  const dropAll = willLoseAllLayers(frame, visualization);
  const { label: visualizationLabel } = visualization.visualizationTypes.find(
    v => v.id === selection.subVisualizationId
  )!;

  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={i18n.translate('xpack.lens.configPanel.dropLayersTitle', {
          defaultMessage: 'Drop layers?',
        })}
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelButtonText={i18n.translate('xpack.lens.configPanel.dropLayersCancelLabel', {
          defaultMessage: `No, keep layers`,
        })}
        confirmButtonText={i18n.translate('xpack.lens.configPanel.dropLayersConfirmLabel', {
          defaultMessage: `Yes, drop layers`,
        })}
        defaultFocusedButton="cancel"
        data-test-subj="lnsConfirmDropLayer"
      >
        <p>
          {dropAll
            ? i18n.translate('xpack.lens.configPanel.dropAllLayersDescription', {
                defaultMessage: 'Switching to {visualizationLabel} will drop all layers.',
                values: { visualizationLabel },
              })
            : i18n.translate('xpack.lens.configPanel.dropAllButLAstLayersDescription', {
                defaultMessage:
                  'Switching to {visualizationLabel} will drop all but the last layers.',
                values: { visualizationLabel },
              })}
        </p>
        <p>
          {i18n.translate('xpack.lens.configPanel.dropLayersPrompt', {
            defaultMessage: 'Are you sure you want to drop layers?',
          })}
        </p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
}

export function ConfigPanelHeader(props: Props) {
  const [state, setState] = useState<State>({ isFlyoutOpen: false });

  const hideFlyout = (force: boolean = false) => {
    if (force || !state.confirmVisualization) {
      setState({ isFlyoutOpen: false });
    }
  };

  const requestConfirmation = (confirmVisualization: VisualizationSelection) => {
    setState({
      ...state,
      confirmVisualization,
    });
  };

  const commitSelection = ({ visualizationId, subVisualizationId }: VisualizationSelection) => {
    hideFlyout(true);

    const visualization = props.visualizationMap[visualizationId];
    const switchVisualizationType = visualization.switchVisualizationType;

    if (visualizationId !== props.visualizationId) {
      const newState = getNewVisualizationState(props.framePublicAPI, visualization);
      props.dispatch({
        type: 'SWITCH_VISUALIZATION',
        newVisualizationId: visualizationId,
        initialState: switchVisualizationType
          ? switchVisualizationType(subVisualizationId, newState)
          : newState,
      });
    } else if (switchVisualizationType) {
      props.dispatch({
        type: 'UPDATE_VISUALIZATION_STATE',
        newState: switchVisualizationType(subVisualizationId, props.visualizationState),
      });
    }
  };

  const onSelect = (selection: VisualizationSelection) => {
    const numLayers = Object.keys(props.framePublicAPI.datasourceLayers).length;
    const shouldRequestConfirmation =
      props.visualizationId !== selection.visualizationId && numLayers > 1;

    if (shouldRequestConfirmation) {
      requestConfirmation(selection);
    } else {
      commitSelection(selection);
    }
  };

  const visualizationTypes = useMemo(
    () =>
      flatten(
        Object.values(props.visualizationMap).map(v =>
          v.visualizationTypes.map(t => ({
            visualizationId: v.id,
            ...t,
          }))
        )
      ),
    [props.visualizationMap]
  );

  return (
    <>
      {state.confirmVisualization && (
        <ConfirmationModal
          frame={props.framePublicAPI}
          selection={state.confirmVisualization}
          visualizationMap={props.visualizationMap}
          onCancel={() => setState({ ...state, confirmVisualization: undefined })}
          onConfirm={() => commitSelection(state.confirmVisualization!)}
        />
      )}
      <EuiPopover
        id="lnsConfigPanelHeaderPopover"
        ownFocus
        button={
          <EuiButton
            iconType="arrowDown"
            iconSide="right"
            onClick={() => setState({ isFlyoutOpen: !state.isFlyoutOpen })}
            data-test-subj="lnsConfigPanelHeaderPopover"
          >
            <VisualizationSummary {...props} />
          </EuiButton>
        }
        isOpen={state.isFlyoutOpen}
        closePopover={() => hideFlyout()}
        anchorPosition="leftUp"
      >
        <EuiPopoverTitle>
          {i18n.translate('xpack.lens.configPanel.chooseVisualization', {
            defaultMessage: 'Choose a visualization',
          })}
        </EuiPopoverTitle>
        <EuiKeyPadMenu>
          {visualizationTypes.map(v => (
            <EuiKeyPadMenuItemButton
              key={`${v.visualizationId}:${v.id}`}
              label={<span data-test-subj="visTypeTitle">{v.label}</span>}
              role="menuitem"
              data-test-subj={`lnsConfigPanelHeaderPopover_${v.id}`}
              onClick={() =>
                onSelect({
                  visualizationId: v.visualizationId,
                  subVisualizationId: v.id,
                })
              }
            >
              <EuiIcon type={v.icon || 'empty'} />
            </EuiKeyPadMenuItemButton>
          ))}
        </EuiKeyPadMenu>
      </EuiPopover>
    </>
  );
}

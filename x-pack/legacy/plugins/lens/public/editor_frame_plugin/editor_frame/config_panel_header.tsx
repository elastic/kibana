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
  EuiModal,
  EuiListGroup,
  EuiListGroupItem,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalFooter,
  EuiButtonEmpty,
} from '@elastic/eui';
import { flatten } from 'lodash';
import { i18n } from '@kbn/i18n';
import { Visualization, FramePublicAPI } from '../../types';
import { Action } from './state_management';

interface VisualizationSelection {
  visualizationId: string;
  subVisualizationId: string;
  options: Array<{
    getVisualizationState: () => unknown;
    title: string;
    icon: string;
    keptLayerId: string;
  }>;
  dataLoss: 'nothing' | 'layers' | 'everything';
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
  onConfirm: (optionIndex: number) => void;
}) {
  const visualization = visualizationMap[selection.visualizationId];
  const { label: visualizationLabel } = visualization.visualizationTypes.find(
    v => v.id === selection.subVisualizationId
  )!;

  if (selection.dataLoss === 'everything') {
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={i18n.translate('xpack.lens.configPanel.lossySwitchLabel', {
            defaultMessage: 'Data loss due to chart switching',
          })}
          onCancel={onCancel}
          onConfirm={() => onConfirm(0)}
          cancelButtonText={i18n.translate('xpack.lens.configPanel.dropLayersCancelLabel', {
            defaultMessage: `No, keep current chart`,
          })}
          confirmButtonText={i18n.translate('xpack.lens.configPanel.dropLayersConfirmLabel', {
            defaultMessage: `Yes, start over`,
          })}
          defaultFocusedButton="cancel"
          data-test-subj="lnsConfirmDropLayer"
        >
          <p>
            {i18n.translate('xpack.lens.configPanel.dropAllLayersDescription', {
              defaultMessage:
                '{visualizationLabel} cannot use your current data and you will have to start over.',
              values: { visualizationLabel },
            })}
          </p>
          <p>
            {i18n.translate('xpack.lens.configPanel.dropLayersPrompt', {
              defaultMessage: 'Are you sure you want to switch charts?',
            })}
          </p>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  } else {
    return (
      <EuiOverlayMask>
        <EuiModal onClose={onCancel} data-test-subj="lnsChooseOption">
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              {i18n.translate('xpack.lens.configPanel.lossySwitchLabel', {
                defaultMessage: 'Data loss due to chart switching',
              })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <p>
              {i18n.translate('xpack.lens.configPanel.dropAllButOneLayerDescription', {
                defaultMessage:
                  'By switching to {visualizationLabel} you will loose a part of your configuration. Please pick your preferred chart',
                values: { visualizationLabel },
              })}
            </p>
            <EuiListGroup maxWidth={false}>
              {selection.options.map((option, index) => (
                <EuiListGroupItem
                  key={index}
                  data-test-subj={`lnsLayerOption-${index}`}
                  wrapText
                  iconType={option.icon}
                  label={option.title}
                  onClick={() => onConfirm(index)}
                />
              ))}
            </EuiListGroup>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty data-test-subj="confirmModalCancelButton" onClick={onCancel}>
              {i18n.translate('xpack.lens.configPanel.dropAllButOneLayerDescriptionCancelLabel', {
                defaultMessage: `Keep current chart`,
              })}
            </EuiButtonEmpty>
          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>
    );
  }
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

  const commitSelection = (selection: VisualizationSelection, optionIndex: number) => {
    hideFlyout(true);

    if (selection.dataLoss === 'everything' || selection.dataLoss === 'layers') {
      dropUnusedLayers(props.framePublicAPI, selection.options[optionIndex].keptLayerId);
    }

    if (selection.visualizationId !== props.visualizationId) {
      props.dispatch({
        type: 'SWITCH_VISUALIZATION',
        newVisualizationId: selection.visualizationId,
        initialState: selection.options[optionIndex].getVisualizationState(),
      });
    } else {
      props.dispatch({
        type: 'UPDATE_VISUALIZATION_STATE',
        newState: selection.options[optionIndex].getVisualizationState(),
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
        options: [
          {
            keptLayerId: '',
            getVisualizationState: () =>
              switchVisType(subVisualizationId, props.visualizationState),
            title: '',
            icon: '',
          },
        ],
      };
    }

    const layers = Object.entries(props.framePublicAPI.datasourceLayers);
    const containsData = layers.some(
      ([_layerId, datasource]) => datasource.getTableSpec().length > 0
    );

    // get ranked suggestions for all layers of current state
    const suggestions = newVisualization
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
      );

    let dataLoss: VisualizationSelection['dataLoss'] = 'nothing';

    if (!suggestions.length && containsData) {
      dataLoss = 'everything';
    } else if (layers.length > 1 && containsData) {
      dataLoss = 'layers';
    }

    return {
      visualizationId,
      subVisualizationId,
      dataLoss,
      options: suggestions.length
        ? suggestions.map(suggestion => ({
            getVisualizationState: () =>
              switchVisType(
                subVisualizationId,
                newVisualization.initialize(props.framePublicAPI, suggestion.suggestion.state)
              ),
            title: suggestion.suggestion.title,
            icon: suggestion.suggestion.previewIcon,
            keptLayerId: suggestion.layerId,
          }))
        : [
            {
              getVisualizationState: () => {
                return switchVisType(
                  subVisualizationId,
                  newVisualization.initialize(props.framePublicAPI)
                );
              },
              icon: '',
              keptLayerId: '',
              title: '',
            },
          ],
    };
  }

  const onSelect = (visualizationId: string, subVisualizationId: string) => {
    const selection = getSelection(visualizationId, subVisualizationId);
    const shouldRequestConfirmation = selection.dataLoss !== 'nothing';

    if (shouldRequestConfirmation) {
      requestConfirmation(selection);
    } else {
      commitSelection(selection, 0);
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
          onConfirm={(optionIndex: number) =>
            commitSelection(state.confirmVisualization!, optionIndex)
          }
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
              onClick={() => onSelect(v.visualizationId, v.id)}
            >
              <EuiIcon type={v.icon || 'empty'} />
            </EuiKeyPadMenuItemButton>
          ))}
        </EuiKeyPadMenu>
      </EuiPopover>
    </>
  );
}

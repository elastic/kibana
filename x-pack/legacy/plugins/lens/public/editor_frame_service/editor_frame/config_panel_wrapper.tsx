/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useContext, memo, useState } from 'react';
import {
  EuiPanel,
  EuiSpacer,
  EuiPopover,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiToolTip,
  EuiButton,
  EuiForm,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NativeRenderer } from '../../native_renderer';
import { Action } from './state_management';
import {
  Visualization,
  FramePublicAPI,
  Datasource,
  VisualizationLayerConfigProps,
} from '../../types';
import { DragContext } from '../../drag_drop';
import { ChartSwitch } from './chart_switch';
import { trackUiEvent } from '../../lens_ui_telemetry';
import { generateId } from '../../id_generator';
import { removeLayer, appendLayer } from './layer_actions';

interface ConfigPanelWrapperProps {
  activeDatasourceId: string;
  visualizationState: unknown;
  visualizationMap: Record<string, Visualization>;
  activeVisualizationId: string | null;
  dispatch: (action: Action) => void;
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

export const ConfigPanelWrapper = memo(function ConfigPanelWrapper(props: ConfigPanelWrapperProps) {
  const activeVisualization = props.visualizationMap[props.activeVisualizationId || ''];
  const { visualizationState } = props;

  return (
    <>
      <ChartSwitch
        data-test-subj="lnsChartSwitcher"
        visualizationMap={props.visualizationMap}
        visualizationId={props.activeVisualizationId}
        visualizationState={props.visualizationState}
        datasourceMap={props.datasourceMap}
        datasourceStates={props.datasourceStates}
        dispatch={props.dispatch}
        framePublicAPI={props.framePublicAPI}
      />
      {activeVisualization && visualizationState && (
        <LayerPanels {...props} activeVisualization={activeVisualization} />
      )}
    </>
  );
});

function LayerPanels(
  props: ConfigPanelWrapperProps & {
    activeDatasourceId: string;
    activeVisualization: Visualization;
  }
) {
  const {
    framePublicAPI,
    activeVisualization,
    visualizationState,
    dispatch,
    activeDatasourceId,
    datasourceMap,
  } = props;
  const dragDropContext = useContext(DragContext);
  const setState = useMemo(
    () => (newState: unknown) => {
      props.dispatch({
        type: 'UPDATE_VISUALIZATION_STATE',
        visualizationId: activeVisualization.id,
        newState,
        clearStagedPreview: false,
      });
    },
    [props.dispatch, activeVisualization]
  );
  const layerIds = activeVisualization.getLayerIds(visualizationState);

  return (
    <EuiForm className="lnsConfigPanel">
      {layerIds.map(layerId => (
        <LayerPanel
          {...props}
          key={layerId}
          layerId={layerId}
          activeVisualization={activeVisualization}
          dragDropContext={dragDropContext}
          state={setState}
          setState={setState}
          frame={framePublicAPI}
          isOnlyLayer={layerIds.length === 1}
          onRemove={() => {
            dispatch({
              type: 'UPDATE_STATE',
              subType: 'REMOVE_OR_CLEAR_LAYER',
              updater: state =>
                removeLayer({
                  activeVisualization,
                  layerId,
                  trackUiEvent,
                  datasourceMap,
                  state,
                }),
            });
          }}
        />
      ))}
      {activeVisualization.appendLayer && (
        <EuiFlexItem grow={true}>
          <EuiToolTip
            className="eui-fullWidth"
            content={i18n.translate('xpack.lens.xyChart.addLayerTooltip', {
              defaultMessage:
                'Use multiple layers to combine chart types or visualize different index patterns.',
            })}
            position="bottom"
          >
            <EuiButton
              className="lnsConfigPanel__addLayerBtn"
              fullWidth
              size="s"
              data-test-subj={`lnsXY_layer_add`}
              aria-label={i18n.translate('xpack.lens.xyChart.addLayerButton', {
                defaultMessage: 'Add layer',
              })}
              title={i18n.translate('xpack.lens.xyChart.addLayerButton', {
                defaultMessage: 'Add layer',
              })}
              onClick={() => {
                dispatch({
                  type: 'UPDATE_STATE',
                  subType: 'ADD_LAYER',
                  updater: state =>
                    appendLayer({
                      activeVisualization,
                      generateId,
                      trackUiEvent,
                      activeDatasource: datasourceMap[activeDatasourceId],
                      state,
                    }),
                });
              }}
              iconType="plusInCircleFilled"
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiForm>
  );
}

function LayerPanel(
  props: ConfigPanelWrapperProps &
    VisualizationLayerConfigProps<unknown> & {
      isOnlyLayer: boolean;
      activeVisualization: Visualization;
      onRemove: () => void;
    }
) {
  const { framePublicAPI, layerId, activeVisualization, isOnlyLayer, onRemove } = props;
  const datasourcePublicAPI = framePublicAPI.datasourceLayers[layerId];
  const layerConfigProps = {
    layerId,
    dragDropContext: props.dragDropContext,
    state: props.visualizationState,
    setState: props.setState,
    frame: props.framePublicAPI,
  };

  return (
    <EuiPanel className="lnsConfigPanel__panel" paddingSize="s">
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false}>
          <LayerSettings
            layerId={layerId}
            layerConfigProps={layerConfigProps}
            activeVisualization={activeVisualization}
          />
        </EuiFlexItem>

        {datasourcePublicAPI && (
          <EuiFlexItem className="eui-textTruncate">
            <NativeRenderer
              render={datasourcePublicAPI.renderLayerPanel}
              nativeProps={{ layerId }}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <NativeRenderer
        render={activeVisualization.renderLayerConfigPanel}
        nativeProps={layerConfigProps}
      />

      <EuiSpacer size="s" />

      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="trash"
            color="danger"
            data-test-subj="lns_layer_remove"
            onClick={() => {
              // If we don't blur the remove / clear button, it remains focused
              // which is a strange UX in this case. e.target.blur doesn't work
              // due to who knows what, but probably event re-writing. Additionally,
              // activeElement does not have blur so, we need to do some casting + safeguards.
              const el = (document.activeElement as unknown) as { blur: () => void };

              if (el && el.blur) {
                el.blur();
              }

              onRemove();
            }}
          >
            {isOnlyLayer
              ? i18n.translate('xpack.lens.resetLayer', {
                  defaultMessage: 'Reset layer',
                })
              : i18n.translate('xpack.lens.deleteLayer', {
                  defaultMessage: 'Delete layer',
                })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

function LayerSettings({
  layerId,
  activeVisualization,
  layerConfigProps,
}: {
  layerId: string;
  activeVisualization: Visualization;
  layerConfigProps: VisualizationLayerConfigProps;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!activeVisualization.renderLayerContextMenu) {
    return null;
  }

  return (
    <EuiPopover
      id={`lnsLayerPopover_${layerId}`}
      panelPaddingSize="s"
      ownFocus
      button={
        <EuiButtonIcon
          iconType={activeVisualization.getLayerContextMenuIcon?.(layerConfigProps) || 'gear'}
          aria-label={i18n.translate('xpack.lens.editLayerSettings', {
            defaultMessage: 'Edit layer settings',
          })}
          onClick={() => setIsOpen(!isOpen)}
          data-test-subj="lns_layer_settings"
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="leftUp"
    >
      <NativeRenderer
        render={activeVisualization.renderLayerContextMenu}
        nativeProps={layerConfigProps}
      />
    </EuiPopover>
  );
}

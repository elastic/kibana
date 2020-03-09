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
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { NativeRenderer } from '../../native_renderer';
import { Action } from './state_management';
import {
  Visualization,
  FramePublicAPI,
  Datasource,
  VisualizationLayerConfigProps,
  DatasourceDimensionEditorProps,
  StateSetter,
} from '../../types';
import { DragContext, DragDrop, ChildDragDropProvider } from '../../drag_drop';
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
  core: DatasourceDimensionEditorProps['core'];
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
  const setVisualizationState = useMemo(
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
  const updateDatasource = useMemo(
    () => (datasourceId: string, newState: unknown) => {
      props.dispatch({
        type: 'UPDATE_DATASOURCE_STATE',
        updater: () => newState,
        datasourceId,
        clearStagedPreview: false,
      });
    },
    [props.dispatch]
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
          visualizationState={visualizationState}
          updateVisualization={setVisualizationState}
          updateDatasource={updateDatasource}
          frame={framePublicAPI}
          isOnlyLayer={layerIds.length === 1}
          onRemoveLayer={() => {
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
  props: Exclude<ConfigPanelWrapperProps, 'state' | 'setState'> & {
    frame: FramePublicAPI;
    layerId: string;
    isOnlyLayer: boolean;
    activeVisualization: Visualization;
    visualizationState: unknown;
    updateVisualization: StateSetter<unknown>;
    updateDatasource: (datasourceId: string, newState: unknown) => void;
    onRemoveLayer: () => void;
  }
) {
  const dragDropContext = useContext(DragContext);
  const { framePublicAPI, layerId, activeVisualization, isOnlyLayer, onRemoveLayer } = props;
  const datasourcePublicAPI = framePublicAPI.datasourceLayers[layerId];
  if (!datasourcePublicAPI) {
    return <></>;
  }
  const layerVisualizationConfigProps = {
    layerId,
    dragDropContext,
    state: props.visualizationState,
    setState: props.updateVisualization,
    frame: props.framePublicAPI,
    dateRange: props.framePublicAPI.dateRange,
  };
  const datasourceId = datasourcePublicAPI.datasourceId;
  const layerDatasourceState = props.datasourceStates[datasourceId].state;
  const layerDatasource = props.datasourceMap[datasourceId];

  const layerDatasourceDropProps = {
    layerId,
    dragDropContext,
    state: layerDatasourceState,
    setState: (newState: unknown) => {
      props.updateDatasource(datasourceId, newState);
    },
  };

  const layerDatasourceConfigProps = {
    ...layerDatasourceDropProps,
    frame: props.framePublicAPI,
    dateRange: props.framePublicAPI.dateRange,
  };

  const [popoverState, setPopoverState] = useState<{
    isOpen: boolean;
    openId: string | null;
  }>({
    isOpen: false,
    openId: null,
  });

  const { dimensions } = activeVisualization.getLayerOptions(layerVisualizationConfigProps);
  const isEmptyLayer = !dimensions.some(d => d.accessors.length > 0);

  function wrapInPopover(id: string, trigger: React.ReactElement, panel: React.ReactElement) {
    return (
      <EuiPopover
        isOpen={popoverState.isOpen && popoverState.openId === id}
        closePopover={() => {
          setPopoverState({ isOpen: false, openId: null });
        }}
        button={trigger}
        display="block"
        anchorPosition="leftUp"
        withTitle
        panelPaddingSize="s"
      >
        {panel}
      </EuiPopover>
    );
  }

  return (
    <ChildDragDropProvider {...dragDropContext}>
      <EuiPanel className="lnsConfigPanel__panel" paddingSize="s">
        <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
          <EuiFlexItem grow={false}>
            <LayerSettings
              layerId={layerId}
              layerConfigProps={layerVisualizationConfigProps}
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

        {dimensions.map((dimension, index) => {
          const newId = generateId();
          const isMissing = !isEmptyLayer && dimension.required && dimension.accessors.length === 0;
          return (
            <EuiFormRow
              className="lnsConfigPanel__axis"
              label={dimension.dimensionLabel}
              key={index}
              isInvalid={isMissing}
              error={
                isMissing
                  ? i18n.translate('xpack.lens.editorFrame.requiredDimensionWarningLabel', {
                      defaultMessage: 'Required dimension',
                    })
                  : []
              }
            >
              <>
                {dimension.accessors.map(accessor => (
                  <DragDrop
                    key={accessor}
                    className="lnsConfigPanel__dimension"
                    data-test-subj="indexPattern-dropTarget"
                    droppable={
                      dragDropContext.dragging &&
                      layerDatasource.canHandleDrop({
                        ...layerDatasourceDropProps,
                        columnId: accessor,
                        filterOperations: dimension.filterOperations,
                      })
                    }
                    onDrop={droppedItem => {
                      layerDatasource.onDrop({
                        ...layerDatasourceDropProps,
                        droppedItem,
                        columnId: accessor,
                        filterOperations: dimension.filterOperations,
                      });
                    }}
                  >
                    {wrapInPopover(
                      accessor,
                      <NativeRenderer
                        render={props.datasourceMap[datasourceId].renderDimensionTrigger}
                        nativeProps={{
                          ...layerDatasourceConfigProps,
                          columnId: accessor,
                          filterOperations: dimension.filterOperations,
                          togglePopover: () => {
                            if (popoverState.isOpen) {
                              setPopoverState({
                                isOpen: false,
                                openId: null,
                              });
                            } else {
                              setPopoverState({
                                isOpen: true,
                                openId: accessor,
                              });
                            }
                          },
                        }}
                      />,
                      <NativeRenderer
                        render={props.datasourceMap[datasourceId].renderDimensionEditor}
                        nativeProps={{
                          ...layerDatasourceConfigProps,
                          core: props.core,
                          columnId: accessor,
                          filterOperations: dimension.filterOperations,
                        }}
                      />
                    )}

                    <EuiButtonIcon
                      data-test-subj="indexPattern-dimensionPopover-remove"
                      iconType="cross"
                      iconSize="s"
                      size="s"
                      color="danger"
                      aria-label={i18n.translate('xpack.lens.indexPattern.removeColumnLabel', {
                        defaultMessage: 'Remove configuration',
                      })}
                      title={i18n.translate('xpack.lens.indexPattern.removeColumnLabel', {
                        defaultMessage: 'Remove configuration',
                      })}
                      onClick={() => {
                        trackUiEvent('indexpattern_dimension_removed');
                        props.updateDatasource(
                          datasourceId,
                          layerDatasource.removeColumn({
                            layerId,
                            columnId: accessor,
                            prevState: layerDatasourceState,
                          })
                        );
                        props.updateVisualization(
                          props.activeVisualization.removeDimension({
                            layerId,
                            dimensionId: dimension.dimensionId,
                            columnId: accessor,
                            prevState: props.visualizationState,
                          })
                        );
                      }}
                    />
                  </DragDrop>
                ))}
                {dimension.supportsMoreColumns ? (
                  <DragDrop
                    className="lnsIndexPatternDimensionPanel"
                    data-test-subj="indexPattern-dropTarget"
                    droppable={
                      dragDropContext.dragging &&
                      layerDatasource.canHandleDrop({
                        ...layerDatasourceDropProps,
                        columnId: newId,
                        filterOperations: dimension.filterOperations,
                      })
                    }
                    onDrop={droppedItem => {
                      const dropSuccess = layerDatasource.onDrop({
                        ...layerDatasourceDropProps,
                        droppedItem,
                        columnId: newId,
                        filterOperations: dimension.filterOperations,
                      });
                      if (dropSuccess) {
                        props.updateVisualization(
                          activeVisualization.setDimension({
                            layerId,
                            dimensionId: dimension.dimensionId,
                            columnId: newId,
                            prevState: props.visualizationState,
                          })
                        );
                      }
                    }}
                  >
                    {wrapInPopover(
                      dimension.dimensionLabel,
                      <EuiButtonEmpty
                        iconType="plusInCircleFilled"
                        data-test-subj="indexPattern-configure-dimension"
                        aria-label={i18n.translate('xpack.lens.configure.addConfig', {
                          defaultMessage: 'Add a configuration',
                        })}
                        title={i18n.translate('xpack.lens.configure.addConfig', {
                          defaultMessage: 'Add a configuration',
                        })}
                        onClick={() => {
                          if (popoverState.isOpen) {
                            setPopoverState({
                              isOpen: false,
                              openId: null,
                            });
                          } else {
                            setPopoverState({
                              isOpen: true,
                              openId: dimension.dimensionLabel,
                            });
                          }
                        }}
                        size="xs"
                      >
                        <FormattedMessage
                          id="xpack.lens.configure.emptyConfig"
                          defaultMessage="Drop a field here"
                        />
                      </EuiButtonEmpty>,
                      <NativeRenderer
                        render={props.datasourceMap[datasourceId].renderDimensionEditor}
                        nativeProps={{
                          ...layerDatasourceConfigProps,
                          core: props.core,
                          columnId: newId,
                          filterOperations: dimension.filterOperations,

                          setState: (newState: unknown) => {
                            props.updateVisualization(
                              activeVisualization.setDimension({
                                layerId,
                                dimensionId: dimension.dimensionId,
                                columnId: newId,
                                prevState: props.visualizationState,
                              })
                            );
                            props.updateDatasource(datasourceId, newState);
                          },
                        }}
                      />
                    )}
                  </DragDrop>
                ) : null}
              </>
            </EuiFormRow>
          );
        })}

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

                onRemoveLayer();
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
    </ChildDragDropProvider>
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

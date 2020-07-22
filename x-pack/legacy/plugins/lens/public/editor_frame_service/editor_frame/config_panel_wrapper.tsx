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
  VisualizationLayerWidgetProps,
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
  const updateAll = useMemo(
    () => (datasourceId: string, newDatasourceState: unknown, newVisualizationState: unknown) => {
      props.dispatch({
        type: 'UPDATE_STATE',
        subType: 'UPDATE_ALL_STATES',
        updater: (prevState) => {
          return {
            ...prevState,
            datasourceStates: {
              ...prevState.datasourceStates,
              [datasourceId]: {
                state: newDatasourceState,
                isLoading: false,
              },
            },
            visualization: {
              ...prevState.visualization,
              state: newVisualizationState,
            },
            stagedPreview: undefined,
          };
        },
      });
    },
    [props.dispatch]
  );
  const layerIds = activeVisualization.getLayerIds(visualizationState);

  return (
    <EuiForm className="lnsConfigPanel">
      {layerIds.map((layerId) => (
        <LayerPanel
          {...props}
          key={layerId}
          layerId={layerId}
          activeVisualization={activeVisualization}
          visualizationState={visualizationState}
          updateVisualization={setVisualizationState}
          updateDatasource={updateDatasource}
          updateAll={updateAll}
          frame={framePublicAPI}
          isOnlyLayer={layerIds.length === 1}
          onRemoveLayer={() => {
            dispatch({
              type: 'UPDATE_STATE',
              subType: 'REMOVE_OR_CLEAR_LAYER',
              updater: (state) =>
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
              data-test-subj="lnsXY_layer_add"
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
                  updater: (state) =>
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
    updateAll: (
      datasourceId: string,
      newDatasourcestate: unknown,
      newVisualizationState: unknown
    ) => void;
    onRemoveLayer: () => void;
  }
) {
  const dragDropContext = useContext(DragContext);
  const { framePublicAPI, layerId, activeVisualization, isOnlyLayer, onRemoveLayer } = props;
  const datasourcePublicAPI = framePublicAPI.datasourceLayers[layerId];
  if (!datasourcePublicAPI) {
    return null;
  }
  const layerVisualizationConfigProps = {
    layerId,
    dragDropContext,
    state: props.visualizationState,
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
    addingToGroupId: string | null;
  }>({
    isOpen: false,
    openId: null,
    addingToGroupId: null,
  });

  const { groups } = activeVisualization.getConfiguration(layerVisualizationConfigProps);
  const isEmptyLayer = !groups.some((d) => d.accessors.length > 0);

  function wrapInPopover(
    id: string,
    groupId: string,
    trigger: React.ReactElement,
    panel: React.ReactElement
  ) {
    const noMatch = popoverState.isOpen ? !groups.some((d) => d.accessors.includes(id)) : false;
    return (
      <EuiPopover
        className="lnsConfigPanel__popover"
        anchorClassName="lnsConfigPanel__trigger"
        isOpen={
          popoverState.isOpen &&
          (popoverState.openId === id || (noMatch && popoverState.addingToGroupId === groupId))
        }
        closePopover={() => {
          setPopoverState({ isOpen: false, openId: null, addingToGroupId: null });
        }}
        button={trigger}
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
              layerConfigProps={{
                ...layerVisualizationConfigProps,
                setState: props.updateVisualization,
              }}
              activeVisualization={activeVisualization}
            />
          </EuiFlexItem>

          {layerDatasource && (
            <EuiFlexItem className="eui-textTruncate">
              <NativeRenderer
                render={layerDatasource.renderLayerPanel}
                nativeProps={{
                  layerId,
                  state: layerDatasourceState,
                  setState: (updater: unknown) => {
                    const newState =
                      typeof updater === 'function' ? updater(layerDatasourceState) : updater;
                    // Look for removed columns
                    const nextPublicAPI = layerDatasource.getPublicAPI({
                      state: newState,
                      layerId,
                      dateRange: props.framePublicAPI.dateRange,
                    });
                    const nextTable = new Set(
                      nextPublicAPI.getTableSpec().map(({ columnId }) => columnId)
                    );
                    const removed = datasourcePublicAPI
                      .getTableSpec()
                      .map(({ columnId }) => columnId)
                      .filter((columnId) => !nextTable.has(columnId));
                    let nextVisState = props.visualizationState;
                    removed.forEach((columnId) => {
                      nextVisState = activeVisualization.removeDimension({
                        layerId,
                        columnId,
                        prevState: nextVisState,
                      });
                    });

                    props.updateAll(datasourceId, newState, nextVisState);
                  },
                }}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        {groups.map((group, index) => {
          const newId = generateId();
          const isMissing = !isEmptyLayer && group.required && group.accessors.length === 0;
          return (
            <EuiFormRow
              className="lnsConfigPanel__row"
              label={group.groupLabel}
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
                {group.accessors.map((accessor) => (
                  <DragDrop
                    key={accessor}
                    className="lnsConfigPanel__dimension"
                    data-test-subj={group.dataTestSubj}
                    droppable={
                      dragDropContext.dragging &&
                      layerDatasource.canHandleDrop({
                        ...layerDatasourceDropProps,
                        columnId: accessor,
                        filterOperations: group.filterOperations,
                      })
                    }
                    onDrop={(droppedItem) => {
                      layerDatasource.onDrop({
                        ...layerDatasourceDropProps,
                        droppedItem,
                        columnId: accessor,
                        filterOperations: group.filterOperations,
                      });
                    }}
                  >
                    {wrapInPopover(
                      accessor,
                      group.groupId,
                      <NativeRenderer
                        render={props.datasourceMap[datasourceId].renderDimensionTrigger}
                        nativeProps={{
                          ...layerDatasourceConfigProps,
                          columnId: accessor,
                          filterOperations: group.filterOperations,
                          suggestedPriority: group.suggestedPriority,
                          togglePopover: () => {
                            if (popoverState.isOpen) {
                              setPopoverState({
                                isOpen: false,
                                openId: null,
                                addingToGroupId: null,
                              });
                            } else {
                              setPopoverState({
                                isOpen: true,
                                openId: accessor,
                                addingToGroupId: null, // not set for existing dimension
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
                          filterOperations: group.filterOperations,
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
                        props.updateAll(
                          datasourceId,
                          layerDatasource.removeColumn({
                            layerId,
                            columnId: accessor,
                            prevState: layerDatasourceState,
                          }),
                          props.activeVisualization.removeDimension({
                            layerId,
                            columnId: accessor,
                            prevState: props.visualizationState,
                          })
                        );
                      }}
                    />
                  </DragDrop>
                ))}
                {group.supportsMoreColumns ? (
                  <DragDrop
                    className="lnsConfigPanel__dimension"
                    data-test-subj={group.dataTestSubj}
                    droppable={
                      dragDropContext.dragging &&
                      layerDatasource.canHandleDrop({
                        ...layerDatasourceDropProps,
                        columnId: newId,
                        filterOperations: group.filterOperations,
                      })
                    }
                    onDrop={(droppedItem) => {
                      const dropSuccess = layerDatasource.onDrop({
                        ...layerDatasourceDropProps,
                        droppedItem,
                        columnId: newId,
                        filterOperations: group.filterOperations,
                      });
                      if (dropSuccess) {
                        props.updateVisualization(
                          activeVisualization.setDimension({
                            layerId,
                            groupId: group.groupId,
                            columnId: newId,
                            prevState: props.visualizationState,
                          })
                        );
                      }
                    }}
                  >
                    {wrapInPopover(
                      newId,
                      group.groupId,
                      <div className="lnsConfigPanel__triggerLink">
                        <EuiButtonEmpty
                          iconType="plusInCircleFilled"
                          data-test-subj="lns-empty-dimension"
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
                                addingToGroupId: null,
                              });
                            } else {
                              setPopoverState({
                                isOpen: true,
                                openId: newId,
                                addingToGroupId: group.groupId,
                              });
                            }
                          }}
                          size="xs"
                        >
                          <FormattedMessage
                            id="xpack.lens.configure.emptyConfig"
                            defaultMessage="Drop a field here"
                          />
                        </EuiButtonEmpty>
                      </div>,
                      <NativeRenderer
                        render={props.datasourceMap[datasourceId].renderDimensionEditor}
                        nativeProps={{
                          ...layerDatasourceConfigProps,
                          core: props.core,
                          columnId: newId,
                          filterOperations: group.filterOperations,
                          suggestedPriority: group.suggestedPriority,

                          setState: (newState: unknown) => {
                            props.updateAll(
                              datasourceId,
                              newState,
                              activeVisualization.setDimension({
                                layerId,
                                groupId: group.groupId,
                                columnId: newId,
                                prevState: props.visualizationState,
                              })
                            );
                            setPopoverState({
                              isOpen: true,
                              openId: newId,
                              addingToGroupId: null, // clear now that dimension exists
                            });
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

                if (el?.blur) {
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
  layerConfigProps: VisualizationLayerWidgetProps;
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

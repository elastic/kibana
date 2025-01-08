/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiPopover,
  EuiIcon,
  EuiContextMenu,
  EuiFlexItem,
  EuiFlexGroup,
  IconType,
  transparentize,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { AddLayerFunction, VisualizationLayerDescription } from '../../types';
import { LoadAnnotationLibraryFlyout } from './load_annotation_library_flyout';
import type { ExtraAppendLayerArg } from './visualization';
import { SeriesType, XYState, visualizationTypes } from './types';
import { isHorizontalChart, isHorizontalSeries, isPercentageSeries } from './state_helpers';
import { getDataLayers } from './visualization_helpers';
import { ExperimentalBadge } from '../../shared_components';
import { ChartOption } from '../../editor_frame_service/editor_frame/config_panel/chart_switch/chart_option';

interface AddLayerButtonProps {
  state: XYState;
  supportedLayers: VisualizationLayerDescription[];
  addLayer: AddLayerFunction<ExtraAppendLayerArg>;
  eventAnnotationService: EventAnnotationServiceType;
  isInlineEditing?: boolean;
}

export enum AddLayerPanelType {
  main = 'main',
  selectAnnotationMethod = 'selectAnnotationMethod',
  compatibleVisualizationTypes = 'compatibleVisualizationTypes',
}

export function AddLayerButton({
  state,
  supportedLayers,
  addLayer,
  eventAnnotationService,
  isInlineEditing,
}: AddLayerButtonProps) {
  const [showLayersChoice, toggleLayersChoice] = useState(false);

  const [isLoadLibraryVisible, setLoadLibraryFlyoutVisible] = useState(false);

  const annotationPanel = ({
    type,
    label,
    icon,
    disabled,
    toolTipContent,
  }: (typeof supportedLayers)[0]) => {
    return {
      panel: AddLayerPanelType.selectAnnotationMethod,
      toolTipContent,
      disabled,
      name: (
        <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
          <EuiFlexItem grow={true}>
            <span className="lnsLayerAddButton__label">{label}</span>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ExperimentalBadge color={disabled ? 'subdued' : undefined} size="m" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      className: 'lnsLayerAddButton',
      icon: icon && <EuiIcon size="m" type={icon} />,
      ['data-test-subj']: `lnsLayerAddButton-${type}`,
    };
  };

  const dataPanel = ({
    type,
    label,
    icon,
    disabled,
    toolTipContent,
  }: (typeof supportedLayers)[0]) => {
    return {
      panel: AddLayerPanelType.compatibleVisualizationTypes,
      toolTipContent,
      disabled,
      name: <span className="lnsLayerAddButtonLabel">{label}</span>,
      className: 'lnsLayerAddButton',
      icon: icon && <EuiIcon size="m" type={icon} />,
      ['data-test-subj']: `lnsLayerAddButton-${type}`,
    };
  };

  const horizontalOnly = isHorizontalChart(state.layers);

  const availableVisTypes = visualizationTypes.filter(
    (t) => isHorizontalSeries(t.id as SeriesType) === horizontalOnly
  );

  const currentLayerTypeIndex =
    availableVisTypes.findIndex((t) => t.id === getDataLayers(state.layers)?.[0]?.seriesType) || 0;

  const firstLayerSubtype = getDataLayers(state.layers)?.[0]?.seriesType;

  return (
    <>
      <EuiPopover
        display="block"
        data-test-subj="lnsConfigPanel__addLayerPopover"
        button={
          <EuiButton
            fullWidth
            data-test-subj="lnsLayerAddButton"
            aria-label={i18n.translate('xpack.lens.configPanel.addLayerButton', {
              defaultMessage: 'Add layer',
            })}
            fill={false}
            color="primary"
            size="s"
            onClick={() => toggleLayersChoice(!showLayersChoice)}
            iconType="layers"
          >
            {i18n.translate('xpack.lens.configPanel.addLayerButton', {
              defaultMessage: 'Add layer',
            })}
          </EuiButton>
        }
        isOpen={showLayersChoice}
        closePopover={() => toggleLayersChoice(false)}
        panelPaddingSize="none"
      >
        <EuiContextMenu
          initialPanelId={AddLayerPanelType.main}
          size="s"
          panels={[
            {
              id: AddLayerPanelType.main,
              title: i18n.translate('xpack.lens.configPanel.selectLayerType', {
                defaultMessage: 'Select layer type',
              }),
              width: 300,
              items: supportedLayers.map((props) => {
                const { type, label, icon, disabled, toolTipContent } = props;
                if (type === LayerTypes.ANNOTATIONS) {
                  return annotationPanel(props);
                } else if (type === LayerTypes.DATA) {
                  if (horizontalOnly) {
                    return {
                      toolTipContent,
                      disabled,
                      name: <span className="lnsLayerAddButtonLabel">{label}</span>,
                      className: 'lnsLayerAddButton',
                      icon: icon && <EuiIcon size="m" type={icon} />,
                      ['data-test-subj']: `lnsLayerAddButton-${type}`,
                      onClick: () => {
                        addLayer(type);
                        toggleLayersChoice(false);
                      },
                    };
                  }
                  return dataPanel(props);
                }
                return {
                  toolTipContent,
                  disabled,
                  name: <span className="lnsLayerAddButtonLabel">{label}</span>,
                  className: 'lnsLayerAddButton',
                  icon: icon && <EuiIcon size="m" type={icon} />,
                  ['data-test-subj']: `lnsLayerAddButton-${type}`,
                  onClick: () => {
                    addLayer(type);
                    toggleLayersChoice(false);
                  },
                };
              }),
            },
            {
              id: AddLayerPanelType.selectAnnotationMethod,
              initialFocusedItemIndex: 0,
              title: i18n.translate('xpack.lens.configPanel.selectAnnotationMethod', {
                defaultMessage: 'Select annotation method',
              }),
              items: [
                {
                  name: i18n.translate('xpack.lens.configPanel.newAnnotation', {
                    defaultMessage: 'New annotation',
                  }),
                  icon: 'plusInCircle',
                  onClick: () => {
                    addLayer(LayerTypes.ANNOTATIONS);
                    toggleLayersChoice(false);
                  },
                  'data-test-subj': 'lnsAnnotationLayer_new',
                },
                {
                  name: i18n.translate('xpack.lens.configPanel.loadFromLibrary', {
                    defaultMessage: 'Load from library',
                  }),
                  icon: 'folderOpen',
                  onClick: () => {
                    setLoadLibraryFlyoutVisible(true);
                    toggleLayersChoice(false);
                  },
                  'data-test-subj': 'lnsAnnotationLayer_addFromLibrary',
                },
              ],
            },
            {
              id: AddLayerPanelType.compatibleVisualizationTypes,
              initialFocusedItemIndex: currentLayerTypeIndex,
              title: i18n.translate('xpack.lens.layerPanel.compatibleVisualizationTypes', {
                defaultMessage: 'Compatible visualization types',
              }),
              width: 340,
              items: availableVisTypes.map((t) => {
                const canInitializeWithSubtype =
                  t.subtypes?.includes(firstLayerSubtype) && !isPercentageSeries(firstLayerSubtype);

                return {
                  renderItem: () => {
                    return (
                      <ChartOptionWrapper
                        type={t.id}
                        label={t.label}
                        description={t.description}
                        icon={t.icon}
                        onClick={() => {
                          addLayer(
                            LayerTypes.DATA,
                            undefined,
                            undefined,
                            canInitializeWithSubtype
                              ? firstLayerSubtype
                              : (t.subtypes?.[0] as SeriesType)
                          );
                          toggleLayersChoice(false);
                        }}
                      />
                    );
                  },
                };
              }),
            },
          ]}
        />
      </EuiPopover>
      {isLoadLibraryVisible && (
        <LoadAnnotationLibraryFlyout
          isLoadLibraryVisible={isLoadLibraryVisible}
          setLoadLibraryFlyoutVisible={setLoadLibraryFlyoutVisible}
          eventAnnotationService={eventAnnotationService}
          isInlineEditing={isInlineEditing}
          addLayer={(extraArg) => {
            addLayer(LayerTypes.ANNOTATIONS, extraArg);
          }}
        />
      )}
    </>
  );
}

const ChartOptionWrapper = ({
  label,
  description,
  icon,
  onClick,
  type,
}: {
  label: string;
  description: string;
  icon: IconType;
  onClick: () => void;
  type: string;
}) => {
  return (
    <button
      data-test-subj={`lnsXY_seriesType-${type}`}
      onClick={onClick}
      className="euiContextMenuItem lnsLayerAddButton"
      css={css`
        padding: ${euiThemeVars.euiSizeS};
        border-bottom: ${euiThemeVars.euiBorderThin};
        border-bottom-color: ${euiThemeVars.euiColorLightestShade};
        width: 100%;
        &: hover, &: focus {
          color: ${euiThemeVars.euiColorPrimary};
          background-color: ${transparentize(euiThemeVars.euiColorPrimary, 0.1)};
          span, .euiText {
            text-decoration: underline;
            color: ${euiThemeVars.euiColorPrimary}};
          }
        }
      `}
    >
      <ChartOption option={{ icon, label, description }} />
    </button>
  );
};

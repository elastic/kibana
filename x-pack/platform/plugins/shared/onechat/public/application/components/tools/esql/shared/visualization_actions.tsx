/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import type {
  InlineEditLensEmbeddableContext,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import type { MapAttributes } from '@kbn/maps-plugin/server';
import type { MapEmbeddableState } from '@kbn/maps-plugin/common';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { EditVisualizationButton, saveButtonLabel } from './edit_visualization_button';
import { actionsContainer } from './styles';
import { MapsActions } from './maps_actions';

interface LensProps {
  onSave: () => void;
  uiActions: UiActionsStart;
  lensInput: TypedLensByValueInput | undefined;
  lensLoadEvent: InlineEditLensEmbeddableContext['lensEvent'] | null;
  setLensInput: (input: TypedLensByValueInput) => void;
  isMap?: false;
}

interface MapProps {
  uiActions: UiActionsStart;
  mapInput: MapEmbeddableState | undefined;
  mapConfig: MapAttributes;
  setMapInput: (input: MapEmbeddableState) => void;
  isMap: true;
}

type Props = LensProps | MapProps;

export function VisualizationActions(props: Props) {
  const { euiTheme } = useEuiTheme();

  // Handle map visualizations
  if (props.isMap) {
    return (
      <MapsActions
        uiActions={props.uiActions}
        mapInput={props.mapInput}
        mapConfig={props.mapConfig}
        setMapInput={props.setMapInput}
      />
    );
  }

  // Handle Lens visualizations
  const { lensInput, lensLoadEvent, setLensInput, onSave, uiActions } = props;

  if (!lensInput) {
    return null;
  }

  const containerCss = css(actionsContainer(euiTheme));
  const iconCss = css({ marginLeft: '-1px' });

  return (
    <div
      className={`visualization-button-actions ${containerCss}`}
      data-test-subj="visualizationButtonActions"
    >
      <EditVisualizationButton
        uiActions={uiActions}
        lensInput={lensInput}
        lensLoadEvent={lensLoadEvent}
        onAttributesChange={(attrs) => setLensInput({ ...lensInput, attributes: attrs })}
        onApply={onSave}
      />
      <EuiButtonIcon
        display="base"
        color="text"
        size="s"
        iconType="save"
        aria-label={saveButtonLabel}
        className={iconCss}
        onClick={onSave}
      />
    </div>
  );
}

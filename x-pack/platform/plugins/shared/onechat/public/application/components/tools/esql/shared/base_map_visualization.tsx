/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiLoadingChart, EuiPanel } from '@elastic/eui';
import type { MapAttributes } from '@kbn/maps-plugin/server';
import type { MapEmbeddableState } from '@kbn/maps-plugin/common';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { MAP_SAVED_OBJECT_TYPE } from '@kbn/maps-plugin/public';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { css } from '@emotion/css';
import { VisualizationActions } from './visualization_actions';

interface Props {
  uiActions: UiActionsStart;
  mapInput: MapEmbeddableState | undefined;
  mapConfig: MapAttributes;
  setMapInput: (input: MapEmbeddableState) => void;
  isLoading: boolean;
}

export function BaseMapVisualization({
  mapInput,
  mapConfig,
  setMapInput,
  uiActions,
  isLoading,
}: Props) {
  const [error, setError] = useState<Error | undefined>();

  const loadingCss = css`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
  `;

  if (!mapInput || isLoading) {
    return (
      <div className={loadingCss}>
        <EuiLoadingChart size="xl" />
      </div>
    );
  }

  if (error) {
    return (
      <EuiPanel color="danger">
        <div>Error rendering map: {error.message}</div>
      </EuiPanel>
    );
  }

  const visualizationCss = css`
    position: relative;
    overflow: hidden;
    min-height: 400px;
    padding: 32px 5px 5px 5px;

    .mapEmbeddableContainer {
      min-height: 400px;
    }

    .embPanel__content {
      min-height: 400px;
    }

    &:hover > .visualization-button-actions,
    &:focus-within > .visualization-button-actions {
      opacity: 1;
      pointer-events: auto;
    }
  `;

  return (
    <div className={visualizationCss}>
      <EmbeddableRenderer
        type={MAP_SAVED_OBJECT_TYPE}
        getParentApi={() => ({
          getSerializedStateForChild: () => ({
            rawState: mapInput,
            references: [],
          }),
          reload$: undefined,
        })}
        onApiAvailable={(api) => {
          // Track API for potential future use
        }}
      />
      <VisualizationActions
        mapInput={mapInput}
        mapConfig={mapConfig}
        setMapInput={setMapInput}
        uiActions={uiActions}
        isMap={true}
      />
    </div>
  );
}

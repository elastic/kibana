/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { themeServiceMock } from '@kbn/core/public/mocks';
import type { MetricVisualizationState } from '@kbn/lens-common';
import { createMockDatasource } from '../../mocks';
import { getMetricVisualization } from '../../visualizations/metric/visualization';
import {
  getLensApiMock,
  getLensInternalApiMock,
  getTextBasedLensSerializedStateMock,
  makeEmbeddableServices,
} from '../mocks';
import { buildUserMessagesHelpers } from './api';
import { UserMessages } from './container';

it('routes the multi-row ES|QL metric warning to the themed dashboard badge popover', async () => {
  const state: MetricVisualizationState = {
    layerId: 'layer1',
    layerType: 'data',
    metricAccessor: 'total',
  };
  const visualization = getMetricVisualization({
    paletteService: chartPluginMock.createPaletteRegistry(),
    theme: themeServiceMock.createStartContract(),
  });
  const datasource = createMockDatasource('textBased');
  datasource.getLayers.mockReturnValue(['layer1']);
  datasource.publicAPIMock.isTextBasedLanguage.mockReturnValue(true);
  const services = makeEmbeddableServices(undefined, undefined, {
    visOverrides: {
      id: visualization.id,
      getUserMessages: (_state, dependencies) =>
        visualization.getUserMessages!(state, dependencies),
    },
    dataOverrides: datasource,
  });
  const api = getLensApiMock();
  const internalApi = getLensInternalApiMock();
  const { attributes } = getTextBasedLensSerializedStateMock(
    'ROW total = [10, 20] | MV_EXPAND total | SORT total'
  );
  if (!attributes) {
    throw new Error('Expected by-value Lens attributes');
  }
  internalApi.updateVisualizationContext({
    activeAttributes: {
      ...attributes,
      visualizationType: visualization.id,
      state: { ...attributes.state, visualization: state },
    },
    activeVisualizationState: state,
    activeDatasourceState: attributes.state.datasourceStates.textBased,
    activeData: {
      layer1: {
        type: 'datatable',
        columns: [{ id: 'total', name: 'total', meta: { type: 'number' } }],
        rows: [{ total: 10 }, { total: 20 }],
      },
    },
  });
  const { getUserMessages } = buildUserMessagesHelpers(api, internalApi, services);
  const warning = 'The metric query returned multiple rows. Only the first row is used.';

  expect(getUserMessages()).toContainEqual(
    expect.objectContaining({ severity: 'warning', shortMessage: warning })
  );
  // The same live dashboard panel displays badges while its inline editor is open and after save.
  renderWithKibanaRenderContext(
    <UserMessages
      blockingErrors={[]}
      warningOrErrors={getUserMessages('embeddableBadge', { severity: 'warning' })}
      infoMessages={[]}
      canEdit={true}
    />
  );
  await userEvent.click(screen.getByTitle('1 warning'));
  expect(await screen.findByText(warning)).toBeInTheDocument();
});

it('opens an existing warning with real theme and i18n context', async () => {
  renderWithKibanaRenderContext(
    <UserMessages
      blockingErrors={[]}
      warningOrErrors={[
        {
          uniqueId: 'provider-control',
          severity: 'warning',
          shortMessage: 'Control warning',
          longMessage: 'Routed warning explanation',
          fixableInEditor: true,
          displayLocations: [{ id: 'embeddableBadge' }],
        },
      ]}
      infoMessages={[]}
      canEdit={true}
    />
  );

  await userEvent.click(screen.getByTitle('1 warning'));
  expect(await screen.findByText('Routed warning explanation')).toBeInTheDocument();
});

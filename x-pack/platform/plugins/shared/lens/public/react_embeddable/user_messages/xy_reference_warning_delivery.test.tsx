/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { Position } from '@elastic/charts';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { themeServiceMock } from '@kbn/core/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { UserMessage, XYVisualizationState } from '@kbn/lens-common';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { eventAnnotationServiceMock } from '@kbn/event-annotation-plugin/public/mocks';
import { createMockDatasource } from '../../mocks';
import { getXyVisualization } from '../../visualizations/xy/visualization';
import {
  getLensApiMock,
  getLensInternalApiMock,
  getTextBasedLensSerializedStateMock,
  makeEmbeddableServices,
} from '../mocks';
import { buildUserMessagesHelpers } from './api';
import { UserMessages } from './container';

const multipleRowsId = 'xy_esql_reference_multiple_rows';
const invalidValueId = 'xy_esql_reference_invalid_value';
const queries = {
  series: 'ROW bucket = [1, 2], count = 10 | MV_EXPAND bucket',
  reference_latency: 'ROW latency = [10, 20] | MV_EXPAND latency | SORT latency',
  reference_errors: 'ROW errors = [30, 40] | MV_EXPAND errors | SORT errors',
};
const labels: Record<string, string> = {
  bucket: 'Bucket',
  count: 'Count',
  latency: 'Latency threshold',
  budget: 'Latency budget',
  errors: 'Error threshold',
};

const createTable = (accessors: string[], rows: Datatable['rows']): Datatable => ({
  type: 'datatable',
  columns: accessors.map((id) => ({ id, name: labels[id], meta: { type: 'number' } })),
  rows,
});

const createHarness = ({
  latencyRows = [{ latency: 10 }, { latency: 20 }],
  errorRows = [{ errors: 30 }, { errors: 40 }],
  latencyAccessors = ['latency'],
  textBased = true,
}: {
  latencyRows?: Datatable['rows'];
  errorRows?: Datatable['rows'];
  latencyAccessors?: string[];
  textBased?: boolean;
} = {}) => {
  const baseServices = makeEmbeddableServices();
  const visualization = getXyVisualization({
    core: baseServices.coreStart,
    storage: new Storage(window.localStorage),
    data: baseServices.data,
    paletteService: chartPluginMock.createPaletteRegistry(),
    fieldFormats: baseServices.fieldFormats,
    kibanaTheme: themeServiceMock.createStartContract(),
    eventAnnotationService: eventAnnotationServiceMock,
    unifiedSearch: unifiedSearchPluginMock.createStartContract(),
    dataViewsService: baseServices.data.dataViews,
  });
  const generateMessages = visualization.getUserMessages;
  if (!generateMessages) {
    throw new Error('Expected XY warning generation');
  }
  const state: XYVisualizationState = {
    preferredSeriesType: 'line',
    legend: { position: Position.Bottom, isVisible: true },
    layers: [
      {
        layerId: 'series',
        layerType: 'data',
        seriesType: 'line',
        xAccessor: 'bucket',
        accessors: ['count'],
      },
      {
        layerId: 'reference_latency',
        layerType: 'referenceLine',
        accessors: latencyAccessors,
      },
      {
        layerId: 'reference_errors',
        layerType: 'referenceLine',
        accessors: ['errors'],
      },
    ],
  };
  const activeData: Record<string, Datatable> = {
    series: createTable(
      ['bucket', 'count'],
      [
        { bucket: 1, count: 10 },
        { bucket: 2, count: 20 },
      ]
    ),
    reference_latency: createTable(latencyAccessors, latencyRows),
    reference_errors: createTable(['errors'], errorRows),
  };
  const datasource = createMockDatasource('textBased');
  const publicApis = Object.fromEntries(
    Object.entries(activeData).map(([layerId, table]) => {
      const { publicAPIMock } = createMockDatasource('textBased');
      publicAPIMock.isTextBasedLanguage.mockReturnValue(textBased);
      publicAPIMock.getTableSpec.mockReturnValue(
        table.columns.map(({ id }) => ({ columnId: id, fields: [id] }))
      );
      publicAPIMock.getOperationForColumnId.mockImplementation((id) => ({
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
        label: labels[id],
        hasTimeShift: false,
        hasReducedTimeRange: false,
      }));
      return [layerId, publicAPIMock];
    })
  );
  datasource.getLayers.mockReturnValue(Object.keys(activeData));
  datasource.getPublicAPI.mockImplementation(({ layerId }) => publicApis[layerId]);
  const datasourceState = {
    layers: Object.fromEntries(
      Object.entries(queries).map(([layerId, esql]) => [
        layerId,
        {
          query: { esql },
          index: 'index',
          columns: activeData[layerId].columns.map(({ id, meta }) => ({
            columnId: id,
            fieldName: id,
            meta,
          })),
        },
      ])
    ),
  };
  const services = makeEmbeddableServices(undefined, undefined, {
    visOverrides: {
      id: visualization.id,
      getUserMessages: (_state, { frame }) => generateMessages(state, { frame }),
    },
    dataOverrides: datasource,
  });
  const internalApi = getLensInternalApiMock();
  const { attributes } = getTextBasedLensSerializedStateMock(queries.series);
  if (!attributes) {
    throw new Error('Expected by-value Lens attributes');
  }
  internalApi.updateVisualizationContext({
    activeAttributes: {
      ...attributes,
      visualizationType: visualization.id,
      state: {
        ...attributes.state,
        visualization: state,
        datasourceStates: { textBased: datasourceState },
      },
    },
    activeVisualizationState: state,
    activeDatasourceState: datasourceState,
    activeData,
  });
  const { getUserMessages: getMessages } = buildUserMessagesHelpers(
    getLensApiMock(),
    internalApi,
    services,
    undefined
  );
  const getUserMessages = (
    locationId?: Parameters<typeof getMessages>[0],
    filters?: Parameters<typeof getMessages>[1]
  ) => getMessages(locationId, filters);
  return { getUserMessages };
};

const renderMessages = (messages: UserMessage[]) =>
  renderWithKibanaRenderContext(
    <UserMessages blockingErrors={[]} warningOrErrors={messages} infoMessages={[]} canEdit={true} />
  );

const selectWarnings = (messages: UserMessage[], id: string) =>
  messages.filter(({ uniqueId }) => uniqueId.startsWith(id));

it('control: opens two readable warning entries with real theme and i18n providers', async () => {
  renderMessages(
    ['Latency control', 'Error control'].map((text, index) => ({
      uniqueId: `provider-control-${index}`,
      severity: 'warning',
      shortMessage: text,
      longMessage: text,
      fixableInEditor: true,
      displayLocations: [{ id: 'embeddableBadge' }],
    }))
  );
  await userEvent.click(screen.getByTitle('2 warnings'));
  expect(screen.getByText('Latency control')).toBeInTheDocument();
  expect(screen.getByText('Error control')).toBeInTheDocument();
});

it('control: independently generates a first-row warning for each reference query', () => {
  const { getUserMessages } = createHarness();
  expect(selectWarnings(getUserMessages(), multipleRowsId)).toHaveLength(2);
  expect(selectWarnings(getUserMessages(), invalidValueId)).toHaveLength(0);
});

it('control: allows multiple threshold columns in one row and multiple ordinary series rows', () => {
  const { getUserMessages } = createHarness({
    latencyRows: [{ latency: 0, budget: 20 }],
    latencyAccessors: ['latency', 'budget'],
    errorRows: [{ errors: 30 }],
  });
  expect(getUserMessages(undefined, { severity: 'warning' })).toHaveLength(0);
});

it('control: excludes form-based static reference layers', () => {
  const { getUserMessages } = createHarness({ textBased: false });
  expect(selectWarnings(getUserMessages(), multipleRowsId)).toHaveLength(0);
});

it('routes both reference-query warnings through the real dashboard badge filter and popover', async () => {
  const { getUserMessages } = createHarness();
  renderMessages(getUserMessages('embeddableBadge', { severity: 'warning' }));
  await userEvent.click(screen.getByTitle('2 warnings'));
  expect(screen.getAllByText(/only the first row is used/i)).toHaveLength(2);
  expect(screen.getByText(/Latency threshold/)).toBeInTheDocument();
  expect(screen.getByText(/Error threshold/)).toBeInTheDocument();
});

it('provides readable accessor-attributed explanations in the actual popover', async () => {
  const { getUserMessages } = createHarness();
  // Bypass location filtering only here to isolate empty longMessage from missing badge routing.
  renderMessages(selectWarnings(getUserMessages(), multipleRowsId));
  await userEvent.click(screen.getByTitle('2 warnings'));
  expect(screen.getAllByText(/only the first row is used/i)).toHaveLength(2);
  expect(screen.getByText(/Latency threshold/)).toBeInTheDocument();
  expect(screen.getByText(/Error threshold/)).toBeInTheDocument();
});

it('gives independent reference-layer warnings distinct stable identities', () => {
  const { getUserMessages } = createHarness();
  const warnings = selectWarnings(getUserMessages(), multipleRowsId);
  expect(warnings).toHaveLength(2);
  expect(new Set(warnings.map(({ uniqueId }) => uniqueId)).size).toBe(2);
  expect(selectWarnings(getUserMessages(), multipleRowsId).map(({ uniqueId }) => uniqueId)).toEqual(
    warnings.map(({ uniqueId }) => uniqueId)
  );
});

it('changes warning identity when only the other reference query becomes multi-row', () => {
  const latencyOnly = createHarness({ errorRows: [{ errors: 30 }] });
  const errorsOnly = createHarness({ latencyRows: [{ latency: 10 }] });
  const latencyWarnings = selectWarnings(latencyOnly.getUserMessages(), multipleRowsId);
  const errorWarnings = selectWarnings(errorsOnly.getUserMessages(), multipleRowsId);
  expect(latencyWarnings).toHaveLength(1);
  expect(errorWarnings).toHaveLength(1);
  expect(latencyWarnings[0].uniqueId).not.toBe(errorWarnings[0].uniqueId);
});

it('gives invalid thresholds from separate queries distinct identities', () => {
  const { getUserMessages } = createHarness({
    latencyRows: [{ latency: null }],
    errorRows: [{ errors: null }],
  });
  const warnings = selectWarnings(getUserMessages(), invalidValueId);
  expect(warnings).toHaveLength(2);
  expect(new Set(warnings.map(({ uniqueId }) => uniqueId)).size).toBe(2);
});

it('identifies the affected query through its configured accessor label', () => {
  const { getUserMessages } = createHarness();
  const warnings = selectWarnings(getUserMessages(), multipleRowsId);
  expect(warnings.map(({ shortMessage }) => shortMessage)).toEqual(
    expect.arrayContaining([
      expect.stringContaining('Latency threshold'),
      expect.stringContaining('Error threshold'),
    ])
  );
});

it('control: warns about a null first threshold even when a later row is numeric', () => {
  const { getUserMessages } = createHarness({
    latencyRows: [{ latency: null }, { latency: 20 }],
    errorRows: [{ errors: 30 }],
  });
  expect(selectWarnings(getUserMessages(), multipleRowsId)).toHaveLength(1);
  const invalidWarnings = selectWarnings(getUserMessages(), invalidValueId);
  expect(invalidWarnings).toHaveLength(1);
  expect(getUserMessages('dimensionButton', { dimensionId: 'latency' })).toEqual(invalidWarnings);
  expect(getUserMessages('dimensionButton', { dimensionId: 'errors' })).toHaveLength(0);
});

it.each([null, NaN, Infinity])(
  'delivers an attributed invalid-first-row warning for %s to the dashboard without changing row selection',
  async (value) => {
    const { getUserMessages } = createHarness({
      latencyRows: [{ latency: value }],
      errorRows: [{ errors: 30 }],
    });
    const invalidWarnings = selectWarnings(getUserMessages(), invalidValueId);
    expect(invalidWarnings).toHaveLength(1);
    renderMessages(getUserMessages('embeddableBadge', { severity: 'warning' }));
    await userEvent.click(screen.getByTitle('1 warning'));
    expect(screen.getByText(/first result row/i)).toBeInTheDocument();
    expect(screen.getByText(/Latency threshold/)).toBeInTheDocument();
  }
);

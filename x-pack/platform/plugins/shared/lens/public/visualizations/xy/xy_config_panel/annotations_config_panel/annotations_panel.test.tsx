/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { ESQLVariableType } from '@kbn/esql-types';
import { getESQLQueryColumns, getESQLTimeField } from '@kbn/esql-utils';
import type { EsqlEventAnnotationConfig } from '@kbn/event-annotation-common';
import type { XYVisualizationState } from '../../types';
import type { AnnotationsPanel as AnnotationsPanelType } from './annotations_panel';
import { AnnotationsPanel } from './annotations_panel';
import { EsqlAnnotationControls } from './esql_annotation_controls';

jest.mock('@kbn/esql-utils', () => ({
  getESQLQueryColumns: jest.fn().mockResolvedValue([]),
  getESQLTimeField: jest.fn().mockResolvedValue('@timestamp'),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: { data: { search: { search: jest.fn() } }, http: {}, uiSettings: {} },
  }),
}));

jest.mock('../../../../app_plugin/shared/edit_on_the_fly/get_time_range_filter', () => ({
  getTimeRangeFilter: () => undefined,
}));

jest.mock('./esql_annotation_controls', () => ({ EsqlAnnotationControls: jest.fn(() => null) }));

// The editor only needs to render the supplied ES|QL controls
jest.mock('@kbn/event-annotation-components', () => ({
  AnnotationEditorControls: ({
    annotation,
    esql,
  }: {
    annotation: unknown;
    esql?: { renderControls: (annotation: unknown, onChange: () => void) => React.ReactNode };
  }) => <>{esql?.renderControls(annotation, jest.fn())}</>,
}));

const annotation: EsqlEventAnnotationConfig = {
  id: 'deployments',
  type: 'esql',
  query: { esql: 'FROM deployments | WHERE service == ?service | KEEP @timestamp' },
  key: { type: 'point_in_time' },
  timeColumn: '@timestamp',
  label: 'Deployments',
};

const esqlVariables: ESQLControlVariable[] = [
  { key: 'service', value: 'api', type: ESQLVariableType.VALUES },
];

const renderPanel = (variables?: ESQLControlVariable[]) => {
  const state = {
    layers: [
      {
        layerId: 'annotations',
        layerType: 'annotations',
        indexPatternId: 'logs',
        ignoreGlobalFilters: true,
        annotations: [annotation],
      },
    ],
  } as unknown as XYVisualizationState;
  const props = {
    state,
    setState: jest.fn(),
    layerId: 'annotations',
    accessor: annotation.id,
    frame: {
      datasourceLayers: { data: { datasourceId: 'textBased' } },
      absDateRange: { fromDate: '2026-01-01T00:00:00Z', toDate: '2026-01-02T00:00:00Z' },
      dataViews: { indexPatterns: {} },
    },
    datatableUtilities: {},
    dataViewsService: {},
    esqlVariables: variables,
  } as unknown as React.ComponentProps<typeof AnnotationsPanelType>;
  return render(<AnnotationsPanel {...props} />);
};

const getFetchColumns = () => {
  const [{ fetchColumns }] = jest.mocked(EsqlAnnotationControls).mock.calls.slice(-1)[0];
  return fetchColumns;
};

describe('AnnotationsPanel ES|QL annotations', () => {
  beforeEach(() => {
    jest.mocked(getESQLQueryColumns).mockClear();
    jest.mocked(getESQLTimeField).mockClear();
    jest.mocked(EsqlAnnotationControls).mockClear();
  });

  it('passes the dashboard ES|QL control variables when loading result columns', async () => {
    renderPanel(esqlVariables);

    await getFetchColumns()(annotation.query, new AbortController().signal);

    await waitFor(() =>
      expect(getESQLQueryColumns).toHaveBeenCalledWith(
        expect.objectContaining({ esqlQuery: annotation.query.esql, variables: esqlVariables })
      )
    );
  });

  it('loads columns without variables when the dashboard has no controls', async () => {
    renderPanel(undefined);

    await getFetchColumns()(annotation.query, new AbortController().signal);

    expect(getESQLQueryColumns).toHaveBeenCalledWith(
      expect.objectContaining({ variables: undefined })
    );
  });
});

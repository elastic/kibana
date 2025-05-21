/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { DataViewSpec } from '@kbn/data-plugin/common';
import { CreateSourceEditor } from './create_source_editor';

jest.mock('../../../kibana_services', () => {
  const DEFAULT_DATA_VIEW_INDEX_PATTERN = 'logs';
  const defaultDataView = {
    fields: [
      {
        name: 'location',
        type: 'geo_point',
      },
      {
        name: '@timestamp',
        type: 'date',
      },
    ],
    timeFieldName: '@timestamp',
    getIndexPattern: () => {
      return DEFAULT_DATA_VIEW_INDEX_PATTERN;
    },
  };

  const otherDataView = {
    fields: [
      {
        name: 'geometry',
        type: 'geo_shape',
      },
    ],
    getIndexPattern: () => {
      return 'world_countries';
    },
  };

  return {
    getIndexPatternService() {
      return {
        create: async (spec: DataViewSpec) => {
          return {
            ...(spec.title === DEFAULT_DATA_VIEW_INDEX_PATTERN ? defaultDataView : otherDataView),
            id: spec.id,
          };
        },
        get: async () => {
          return otherDataView;
        },
        getDefaultDataView: async () => {
          return defaultDataView;
        },
      };
    },
  };
});

describe('CreateSourceEditor', () => {
  test('should preview default data view on load', async () => {
    const onSourceConfigChange = jest.fn();
    render(<CreateSourceEditor onSourceConfigChange={onSourceConfigChange} />);
    await waitFor(() =>
      expect(onSourceConfigChange).toBeCalledWith({
        columns: [
          {
            name: 'location',
            type: 'geo_point',
          },
        ],
        dataViewId: '30de729e173668cbf8954aa56c4aca5b82a1005586a608b692dae478219f8c76',
        dateField: '@timestamp',
        esql: 'from logs | keep location | limit 10000',
        geoField: 'location',
        narrowByGlobalSearch: true,
        narrowByGlobalTime: true,
        narrowByMapBounds: true,
      })
    );
  });

  test('should preview requested data view on load when mostCommonDataViewId prop provided', async () => {
    const onSourceConfigChange = jest.fn();
    render(
      <CreateSourceEditor
        onSourceConfigChange={onSourceConfigChange}
        mostCommonDataViewId="123abc"
      />
    );
    await waitFor(() =>
      expect(onSourceConfigChange).toBeCalledWith({
        columns: [
          {
            name: 'geometry',
            type: 'geo_shape',
          },
        ],
        dataViewId: 'c9f096614a62aa31893a2d6e8f43139bda7dcdb262b9373f79d0173cc152b4a4',
        dateField: undefined,
        esql: 'from world_countries | keep geometry | limit 10000',
        geoField: 'geometry',
        narrowByGlobalSearch: true,
        narrowByGlobalTime: false,
        narrowByMapBounds: true,
      })
    );
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { createMockDatasource } from '../editor_frame_plugin/mocks';
import {
  DatatableVisualizationState,
  datatableVisualization,
  DataTableLayer,
} from './visualization';
import { mount } from 'enzyme';
import { Operation, DataType, FramePublicAPI } from '../types';
import { generateId } from '../id_generator';

jest.mock('../id_generator');

function mockFrame(): FramePublicAPI {
  return {
    addNewLayer: () => 'aaa',
    removeLayers: () => {},
    datasourceLayers: {},
    query: { query: '', language: 'lucene' },
    dateRange: {
      fromDate: 'now-7d',
      toDate: 'now',
    },
    filters: [],
  };
}

describe('Datatable Visualization', () => {
  describe('#initialize', () => {
    it('should initialize from the empty state', () => {
      (generateId as jest.Mock).mockReturnValueOnce('id');
      expect(datatableVisualization.initialize(mockFrame(), undefined)).toEqual({
        layers: [
          {
            layerId: 'aaa',
            columns: ['id'],
          },
        ],
      });
    });

    it('should initialize from a persisted state', () => {
      const expectedState: DatatableVisualizationState = {
        layers: [
          {
            layerId: 'foo',
            columns: ['saved'],
          },
        ],
      };
      expect(datatableVisualization.initialize(mockFrame(), expectedState)).toEqual(expectedState);
    });
  });

  describe('#getPersistableState', () => {
    it('should persist the internal state', () => {
      const expectedState: DatatableVisualizationState = {
        layers: [
          {
            layerId: 'baz',
            columns: ['a', 'b', 'c'],
          },
        ],
      };
      expect(datatableVisualization.getPersistableState(expectedState)).toEqual(expectedState);
    });
  });

  describe('DataTableLayer', () => {
    it('allows all kinds of operations', () => {
      const setState = jest.fn();
      const datasource = createMockDatasource();
      const layer = { layerId: 'a', columns: ['b', 'c'] };
      const frame = mockFrame();
      frame.datasourceLayers = { a: datasource.publicAPIMock };

      mount(
        <DataTableLayer
          dragDropContext={{ dragging: undefined, setDragging: () => {} }}
          frame={frame}
          layer={layer}
          setState={setState}
          state={{ layers: [layer] }}
        />
      );

      expect(datasource.publicAPIMock.renderDimensionPanel).toHaveBeenCalled();

      const filterOperations =
        datasource.publicAPIMock.renderDimensionPanel.mock.calls[0][1].filterOperations;

      const baseOperation: Operation = {
        dataType: 'string',
        isBucketed: true,
        label: '',
      };
      expect(filterOperations({ ...baseOperation })).toEqual(true);
      expect(filterOperations({ ...baseOperation, dataType: 'number' })).toEqual(true);
      expect(filterOperations({ ...baseOperation, dataType: 'date' })).toEqual(true);
      expect(filterOperations({ ...baseOperation, dataType: 'boolean' })).toEqual(true);
      expect(filterOperations({ ...baseOperation, dataType: 'other' as DataType })).toEqual(true);
      expect(filterOperations({ ...baseOperation, dataType: 'date', isBucketed: false })).toEqual(
        true
      );
    });

    it('allows columns to be removed', () => {
      const setState = jest.fn();
      const datasource = createMockDatasource();
      const layer = { layerId: 'a', columns: ['b', 'c'] };
      const frame = mockFrame();
      frame.datasourceLayers = { a: datasource.publicAPIMock };
      const component = mount(
        <DataTableLayer
          dragDropContext={{ dragging: undefined, setDragging: () => {} }}
          frame={frame}
          layer={layer}
          setState={setState}
          state={{ layers: [layer] }}
        />
      );

      const onRemove = component
        .find('[data-test-subj="datatable_multicolumnEditor"]')
        .first()
        .prop('onRemove') as (k: string) => {};

      onRemove('b');

      expect(setState).toHaveBeenCalledWith({
        layers: [
          {
            layerId: 'a',
            columns: ['c'],
          },
        ],
      });
    });

    it('allows columns to be added', () => {
      (generateId as jest.Mock).mockReturnValueOnce('d');
      const setState = jest.fn();
      const datasource = createMockDatasource();
      const layer = { layerId: 'a', columns: ['b', 'c'] };
      const frame = mockFrame();
      frame.datasourceLayers = { a: datasource.publicAPIMock };
      const component = mount(
        <DataTableLayer
          dragDropContext={{ dragging: undefined, setDragging: () => {} }}
          frame={frame}
          layer={layer}
          setState={setState}
          state={{ layers: [layer] }}
        />
      );

      const onAdd = component
        .find('[data-test-subj="datatable_multicolumnEditor"]')
        .first()
        .prop('onAdd') as () => {};

      onAdd();

      expect(setState).toHaveBeenCalledWith({
        layers: [
          {
            layerId: 'a',
            columns: ['b', 'c', 'd'],
          },
        ],
      });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { createMockDatasource } from '../editor_frame_plugin/mocks';
import {
  DatatableVisualizationState,
  DatatableConfigPanel,
  datatableVisualization,
} from './visualization';
import { mount } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { Operation, DataType } from '../types';
import { generateId } from '../id_generator';

jest.mock('../id_generator');

describe('Datatable Visualization', () => {
  describe('#initialize', () => {
    it('should initialize from the empty state', () => {
      const datasource = createMockDatasource();
      (generateId as jest.Mock).mockReturnValueOnce('id');
      expect(datatableVisualization.initialize(datasource.publicAPIMock)).toEqual({
        columns: [{ id: 'id', label: '' }],
      });
    });

    it('should initialize from a persisted state', () => {
      const datasource = createMockDatasource();
      const expectedState: DatatableVisualizationState = {
        columns: [{ id: 'saved', label: 'label' }],
      };
      expect(datatableVisualization.initialize(datasource.publicAPIMock, expectedState)).toEqual(
        expectedState
      );
    });
  });

  describe('#getPersistableState', () => {
    it('should persist the internal state', () => {
      const expectedState: DatatableVisualizationState = {
        columns: [{ id: 'saved', label: 'label' }],
      };
      expect(datatableVisualization.getPersistableState(expectedState)).toEqual(expectedState);
    });
  });

  describe('DatatableConfigPanel', () => {
    it('should update the column label', () => {
      const setState = jest.fn();
      const wrapper = mount(
        <DatatableConfigPanel
          dragDropContext={{ dragging: undefined, setDragging: () => {} }}
          datasource={createMockDatasource().publicAPIMock}
          setState={setState}
          state={{ columns: [{ id: 'saved', label: 'label' }] }}
        />
      );

      const labelEditor = wrapper.find('[data-test-subj="lnsDatatable-columnLabel"]').at(1);

      act(() => {
        labelEditor.simulate('change', { target: { value: 'New Label' } });
      });

      expect(setState).toHaveBeenCalledWith({
        columns: [{ id: 'saved', label: 'New Label' }],
      });
    });

    it('should allow all operations to be shown', () => {
      const setState = jest.fn();
      const datasource = createMockDatasource();

      mount(
        <DatatableConfigPanel
          dragDropContext={{ dragging: undefined, setDragging: () => {} }}
          datasource={datasource.publicAPIMock}
          setState={setState}
          state={{ columns: [{ id: 'saved', label: 'label' }] }}
        />
      );

      expect(datasource.publicAPIMock.renderDimensionPanel).toHaveBeenCalled();

      const filterOperations =
        datasource.publicAPIMock.renderDimensionPanel.mock.calls[0][1].filterOperations;

      const baseOperation: Operation = {
        dataType: 'string',
        isBucketed: true,
        label: '',
        id: '',
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

    it('should remove a column', () => {
      const setState = jest.fn();
      const wrapper = mount(
        <DatatableConfigPanel
          dragDropContext={{ dragging: undefined, setDragging: () => {} }}
          datasource={createMockDatasource().publicAPIMock}
          setState={setState}
          state={{ columns: [{ id: 'saved', label: '' }, { id: 'second', label: '' }] }}
        />
      );

      act(() => {
        wrapper
          .find('[data-test-subj="lnsDatatable_dimensionPanelRemove_saved"]')
          .first()
          .simulate('click');
      });

      expect(setState).toHaveBeenCalledWith({
        columns: [{ id: 'second', label: '' }],
      });
    });

    it('should be able to add more columns', () => {
      const setState = jest.fn();
      const datasource = createMockDatasource();
      const wrapper = mount(
        <DatatableConfigPanel
          dragDropContext={{ dragging: undefined, setDragging: () => {} }}
          datasource={datasource.publicAPIMock}
          setState={setState}
          state={{ columns: [{ id: 'saved', label: 'label' }] }}
        />
      );

      (generateId as jest.Mock).mockReturnValueOnce('newId');

      act(() => {
        wrapper
          .find('[data-test-subj="lnsDatatable_dimensionPanel_add"]')
          .first()
          .simulate('click');
      });

      expect(setState).toHaveBeenCalledWith({
        columns: [{ id: 'saved', label: 'label' }, { id: 'newId', label: '' }],
      });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatatableVisualizationState } from '@kbn/lens-common';
import { datatableStateAdapter } from './datatable';

const baseState: DatatableVisualizationState = {
  layerId: 'layer1',
  layerType: 'data',
  columns: [{ columnId: 'col1' }],
};

describe('datatableStateAdapter', () => {
  describe('stateToFormValues', () => {
    it('converts density to API form values', () => {
      const state: DatatableVisualizationState = {
        ...baseState,
        density: 'compact',
      };
      const result = datatableStateAdapter.stateToFormValues(state);
      expect(result['styling.density.mode']).toBe('compact');
    });

    it('converts normal density to "default" in API format', () => {
      const state: DatatableVisualizationState = {
        ...baseState,
        density: 'normal',
      };
      const result = datatableStateAdapter.stateToFormValues(state);
      expect(result['styling.density.mode']).toBe('default');
    });

    it('converts paging to API form values', () => {
      const state: DatatableVisualizationState = {
        ...baseState,
        paging: { enabled: true, size: 20 },
      };
      const result = datatableStateAdapter.stateToFormValues(state);
      expect(result['styling.paging']).toBe(20);
    });

    it('does not include paging when disabled', () => {
      const state: DatatableVisualizationState = {
        ...baseState,
        paging: { enabled: false, size: 20 },
      };
      const result = datatableStateAdapter.stateToFormValues(state);
      expect(result['styling.paging']).toBeUndefined();
    });

    it('converts showRowNumbers to API form values', () => {
      const state: DatatableVisualizationState = {
        ...baseState,
        showRowNumbers: true,
      };
      const result = datatableStateAdapter.stateToFormValues(state);
      expect(result['styling.row_numbers.visible']).toBe(true);
    });

    it('converts row height to API form values', () => {
      const state: DatatableVisualizationState = {
        ...baseState,
        rowHeight: 'custom',
        rowHeightLines: 3,
        headerRowHeight: 'auto',
      };
      const result = datatableStateAdapter.stateToFormValues(state);
      expect(result['styling.density.height.value.type']).toBe('custom');
      expect(result['styling.density.height.value.lines']).toBe(3);
      expect(result['styling.density.height.header.type']).toBe('auto');
    });

    it('returns empty object when no styling properties are set', () => {
      const result = datatableStateAdapter.stateToFormValues(baseState);
      expect(result).toEqual({});
    });
  });

  describe('formValuesToState', () => {
    it('converts API density mode back to internal state', () => {
      const result = datatableStateAdapter.formValuesToState(baseState, {
        'styling.density.mode': 'compact',
      });
      expect(result.density).toBe('compact');
      expect(result.layerId).toBe('layer1');
      expect(result.columns).toEqual([{ columnId: 'col1' }]);
    });

    it('converts "default" density to "normal"', () => {
      const result = datatableStateAdapter.formValuesToState(baseState, {
        'styling.density.mode': 'default',
      });
      expect(result.density).toBe('normal');
    });

    it('converts API paging back to internal state', () => {
      const result = datatableStateAdapter.formValuesToState(baseState, {
        'styling.paging': 30,
      });
      expect(result.paging).toEqual({ enabled: true, size: 30 });
    });

    it('converts API row_numbers back to internal state', () => {
      const result = datatableStateAdapter.formValuesToState(baseState, {
        'styling.row_numbers.visible': true,
      });
      expect(result.showRowNumbers).toBe(true);
    });

    it('converts API row height back to internal state', () => {
      const result = datatableStateAdapter.formValuesToState(baseState, {
        'styling.density.height.value.type': 'custom',
        'styling.density.height.value.lines': 3,
        'styling.density.height.header.type': 'auto',
      });
      expect(result.rowHeight).toBe('custom');
      expect(result.rowHeightLines).toBe(3);
      expect(result.headerRowHeight).toBe('auto');
    });

    it('preserves non-styling properties', () => {
      const stateWithExtras: DatatableVisualizationState = {
        ...baseState,
        sorting: { columnId: 'col1', direction: 'asc' },
      };
      const result = datatableStateAdapter.formValuesToState(stateWithExtras, {
        'styling.density.mode': 'compact',
      });
      expect(result.sorting).toEqual({ columnId: 'col1', direction: 'asc' });
      expect(result.layerId).toBe('layer1');
      expect(result.layerType).toBe('data');
      expect(result.columns).toEqual([{ columnId: 'col1' }]);
    });
  });

  describe('round-trip', () => {
    it('preserves styling through stateToFormValues → formValuesToState', () => {
      const state: DatatableVisualizationState = {
        ...baseState,
        density: 'compact',
        rowHeight: 'custom',
        rowHeightLines: 3,
        headerRowHeight: 'auto',
        paging: { enabled: true, size: 20 },
        showRowNumbers: true,
      };

      const formValues = datatableStateAdapter.stateToFormValues(state);
      const result = datatableStateAdapter.formValuesToState(baseState, formValues);

      expect(result.density).toBe('compact');
      expect(result.rowHeight).toBe('custom');
      expect(result.rowHeightLines).toBe(3);
      expect(result.headerRowHeight).toBe('auto');
      expect(result.paging).toEqual({ enabled: true, size: 20 });
      expect(result.showRowNumbers).toBe(true);
    });
  });
});

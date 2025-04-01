/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datatable } from '@kbn/expressions-plugin/common';
import { getActiveDataFromDatatable } from './shared_logic';

describe('lens shared logic', () => {
  describe('#getActiveDataFromDatatable', () => {
    const defaultLayerId = 'default-layer';
    const firstTable: Datatable = {
      type: 'datatable',
      columns: [],
      rows: [],
    };
    const secondTable: Datatable = {
      type: 'datatable',
      columns: [],
      rows: [],
    };

    it('should return {} for empty datatable', () => {
      expect(getActiveDataFromDatatable(defaultLayerId, undefined)).toEqual({});
    });

    it('should return multiple tables', () => {
      const datatables: Record<string, Datatable> = {
        first: firstTable,
        second: secondTable,
      };
      expect(getActiveDataFromDatatable(defaultLayerId, datatables)).toEqual({
        first: firstTable,
        second: secondTable,
      });
    });

    it('should return since table with default layer id', () => {
      const datatables: Record<string, Datatable> = {
        first: firstTable,
      };
      expect(getActiveDataFromDatatable(defaultLayerId, datatables)).toEqual({
        [defaultLayerId]: firstTable,
      });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mergeTables } from './merge_tables';
import { KibanaDatatable } from 'src/legacy/core_plugins/interpreter/public';

describe('lens_merge_tables', () => {
  it('should produce a row with the nested table as defined', () => {
    const sampleTable1: KibanaDatatable = {
      type: 'kibana_datatable',
      columns: [{ id: 'bucket', name: 'A' }, { id: 'count', name: 'Count' }],
      rows: [{ bucket: 'a', count: 5 }, { bucket: 'b', count: 10 }],
    };

    const sampleTable2: KibanaDatatable = {
      type: 'kibana_datatable',
      columns: [{ id: 'bucket', name: 'C' }, { id: 'avg', name: 'Average' }],
      rows: [{ bucket: 'a', avg: 2.5 }, { bucket: 'b', avg: 9 }],
    };

    expect(
      mergeTables.fn(
        null,
        { layerIds: ['first', 'second'], tables: [sampleTable1, sampleTable2] },
        {}
      )
    ).toEqual({
      tables: { first: sampleTable1, second: sampleTable2 },
      type: 'lens_multitable',
    });
  });
});

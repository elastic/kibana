/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenericIndexPatternColumn, IndexPattern } from '@kbn/lens-common';
import { createCoreSetupMock } from '@kbn/core-lifecycle-browser-mocks/src/core_setup.mock';
import { createEsAggsIdMapEntry } from './create_es_aggs_id_map_entry';
import { defaultUiSettingsGet } from './__mocks__/ui_settings';
import { mockDateRange } from './__mocks__/esql_query_mocks';

describe('createEsAggsIdMapEntry', () => {
  const { uiSettings } = createCoreSetupMock();
  uiSettings.get.mockImplementation(defaultUiSettingsGet);

  it('should create an esAggsIdMap entry from a column', () => {
    const col: GenericIndexPatternColumn = {
      operationType: 'count',
      sourceField: '___records___',
      label: 'My Custom Count',
      customLabel: true,
      dataType: 'number',
      isBucketed: false,
    };

    const result = createEsAggsIdMapEntry({
      col,
      colId: 'col-1',
      layer: { columns: {}, columnOrder: [], indexPatternId: 'test-index' },
      indexPattern: {
        title: 'test-index',
        getFieldByName: (name: string) => ({ name, displayName: name }),
      } as unknown as IndexPattern,
      uiSettings,
      dateRange: mockDateRange,
      format: { id: 'number', params: { decimals: 2 } },
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'col-1',
      operationType: 'count',
      label: 'My Custom Count',
      format: { id: 'number', params: { decimals: 2 } },
    });
  });
});

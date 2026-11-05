/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import { toTemplateData } from './custom_template';

describe('toTemplateData', () => {
  it('orders row values by column and prefers the Elasticsearch type', () => {
    const table: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'host', name: 'host', meta: { type: 'string', esType: 'keyword' } },
        { id: 'count', name: 'count', meta: { type: 'number' } },
      ],
      rows: [
        { count: 3, host: 'a' },
        { host: 'b', count: 5 },
      ],
    };

    expect(toTemplateData(table)).toEqual({
      columns: [
        { name: 'host', type: 'keyword' },
        { name: 'count', type: 'number' },
      ],
      rows: [
        ['a', 3],
        ['b', 5],
      ],
    });
  });
});

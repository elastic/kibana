/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esqlToFile } from './export';

describe('esqlToFile', () => {
  const result = {
    isPartial: false,
    columns: [
      { name: 'event.action', type: 'keyword' },
      { name: 'events', type: 'long' },
    ],
    values: [['task-run', 3]],
  };

  it('writes CSV with a sanitized filename', () => {
    expect(esqlToFile('.kibana-event-log-*', result, 'csv')).toEqual({
      body: 'event.action,events\r\ntask-run,3\r\n',
      contentType: 'text/csv; charset=utf-8',
      filename: '.kibana-event-log-_.csv',
    });
  });

  it('writes JSON rows keyed by column name', () => {
    const file = esqlToFile('esql', result, 'json');
    expect(JSON.parse(file.body)).toEqual({
      columns: result.columns,
      rows: [{ 'event.action': 'task-run', events: 3 }],
    });
    expect(file.filename).toBe('esql.json');
  });
});

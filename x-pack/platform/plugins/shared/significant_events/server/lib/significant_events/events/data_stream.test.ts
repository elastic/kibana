/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventsDataStream, eventsMappings } from './data_stream';

describe('Significant Events data stream', () => {
  it('maps severity assessment history in version 13', () => {
    expect(eventsDataStream.version).toBe(13);
    expect(eventsMappings.properties.severity_assessments).toMatchObject({
      type: 'object',
      properties: {
        source: { type: 'keyword' },
        severity: { type: 'keyword' },
        assessed_at: { type: 'date', format: 'strict_date_optional_time' },
        invalidated_at: { type: 'date', format: 'strict_date_optional_time' },
        workflow_execution_id: { type: 'keyword' },
      },
    });
  });
});

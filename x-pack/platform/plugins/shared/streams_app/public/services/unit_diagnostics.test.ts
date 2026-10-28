/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Unit } from './unit_repository';
import { getProcessingDiagnostics } from './unit_diagnostics';

const savedUnit: Unit = {
  unit: {
    sources: [],
    destinations: [],
    processors: [
      { id: 'add-fields-1', type: 'add_fields', supported_telemetry: ['logs'] },
      { id: 'add-fields-2', type: 'add_fields', supported_telemetry: ['logs'] },
    ],
    pipelines: [],
  },
  ui_metadata: {},
};

const fetchError = (diagnostics: object[]) =>
  Object.assign(new Error('Bad Request'), {
    name: 'HttpFetchError',
    request: {},
    body: { statusCode: 400, attributes: { data: { valid: false, diagnostics } } },
  });

describe('getProcessingDiagnostics', () => {
  it('traces schema violations by processor index and compiler errors by id', () => {
    expect(
      getProcessingDiagnostics(
        fetchError([
          {
            code: 'E034_SCHEMA_VIOLATION',
            message:
              'processors.1.config.0.value.0.path: String length must be greater than or equal to 1',
            severity: 'error',
          },
          { code: 'E027', message: 'invalid config', path: 'processors > add-fields-1' },
          { code: 'E017', message: 'pipeline has no way out', path: 'pipelines > main' },
        ]),
        savedUnit
      )
    ).toEqual([
      {
        code: 'E034_SCHEMA_VIOLATION',
        message:
          'processors.1.config.0.value.0.path: String length must be greater than or equal to 1',
        processorId: 'add-fields-2',
      },
      { code: 'E027', message: 'invalid config', processorId: 'add-fields-1' },
      { code: 'E017', message: 'pipeline has no way out', processorId: undefined },
    ]);
  });

  it('returns nothing for errors that are not HTTP responses', () => {
    expect(getProcessingDiagnostics(new Error('boom'), savedUnit)).toEqual([]);
  });
});

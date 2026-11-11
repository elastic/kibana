/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Unit } from './unit_repository';
import { getProcessingDiagnostics, getRoutingDiagnostics } from './unit_diagnostics';

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
  it('traces schema violations by the index in the message and compiler errors by the pointer', () => {
    expect(
      getProcessingDiagnostics(
        fetchError([
          {
            code: 'E034_SCHEMA_VIOLATION',
            message:
              'processors.1.config.0.value.0.path: String length must be greater than or equal to 1',
            severity: 'error',
          },
          { code: 'E027', message: 'invalid config', path: '/processors/0/config/0' },
          { code: 'E017', message: 'pipeline has no way out', path: '/pipelines/0' },
          { code: 'E002', message: 'unknown processor', path: '/processors/5' },
          { code: 'E016', message: 'pipeline references processors.1 twice', path: '/pipelines/0' },
          { code: 'E099', message: 'see processors.0 for the conflicting field' },
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
      { code: 'E002', message: 'unknown processor', processorId: undefined },
      { code: 'E016', message: 'pipeline references processors.1 twice', processorId: undefined },
      {
        code: 'E099',
        message: 'see processors.0 for the conflicting field',
        processorId: undefined,
      },
    ]);
  });

  it('returns nothing for errors that are not HTTP responses', () => {
    expect(getProcessingDiagnostics(new Error('boom'), savedUnit)).toEqual([]);
  });
});

describe('getRoutingDiagnostics', () => {
  const routedUnit: Unit = {
    unit: {
      sources: [{ id: 'src', type: 'otlp', supported_telemetry: ['logs'] }],
      destinations: [{ id: 'es', type: 'elasticsearch', supported_telemetry: ['logs'] }],
      processors: [{ id: 'tag', type: 'add_fields', supported_telemetry: ['logs'] }],
      pipelines: [
        {
          id: 'main',
          supported_telemetry: ['logs'],
          config: [
            { name: 'sources', value: ['src'] },
            { name: 'processors', value: ['tag'] },
            {
              name: 'routes',
              value: [
                // Not connected yet, so it is left out of the unit as sent.
                { when: 'body == "new"', destinations: [] },
                { when: 'body == "x"', destinations: ['es'] },
                { destinations: ['es'] },
              ],
            },
          ],
        },
      ],
    },
    ui_metadata: {},
  };

  it('traces a condition error back to the staged rule, past rules left out of the save', () => {
    expect(
      getRoutingDiagnostics(
        fetchError([
          {
            severity: 'error',
            code: 'E050',
            message: 'bad condition',
            path: '/pipelines/0/config/2/value/0/when',
          },
        ]),
        routedUnit
      )
    ).toEqual([{ code: 'E050', message: 'bad condition', pipelineId: 'main', ruleIndex: 1 }]);
  });

  it('reads schema violations by the location in the message, and keeps node-level ones', () => {
    expect(
      getRoutingDiagnostics(
        fetchError([
          {
            severity: 'error',
            code: 'E034_SCHEMA_VIOLATION',
            message: 'pipelines.0.config.2.value.1.when: String must not be empty',
          },
          {
            severity: 'error',
            code: 'E017',
            message: 'pipeline has no way out',
            path: '/pipelines/0',
          },
        ]),
        routedUnit
      )
    ).toEqual([
      {
        code: 'E034_SCHEMA_VIOLATION',
        message: 'pipelines.0.config.2.value.1.when: String must not be empty',
        pipelineId: 'main',
        ruleIndex: 2,
      },
      { code: 'E017', message: 'pipeline has no way out', pipelineId: 'main' },
    ]);
  });

  it("ignores diagnostics about a pipeline's processing, other pipelines or other parts", () => {
    expect(
      getRoutingDiagnostics(
        fetchError([
          { severity: 'error', code: 'E027', message: 'bad', path: '/pipelines/0/config/1' },
          { severity: 'error', code: 'E002', message: 'bad', path: '/pipelines/4' },
          { severity: 'error', code: 'E003', message: 'bad', path: '/processors/0' },
        ]),
        routedUnit
      )
    ).toEqual([]);
    expect(getRoutingDiagnostics(new Error('offline'), routedUnit)).toEqual([]);
  });
});

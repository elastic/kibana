/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESErrorCausedBy } from './identify_es_error';
import { identifyEsError } from './identify_es_error';

describe('identifyEsError', () => {
  test('extracts messages from root cause', () => {
    expect(
      identifyEsError(
        generateESErrorWithResponse(
          [
            {
              type: 'illegal_argument_exception',
              reason: 'root cause',
            },
          ],
          {}
        )
      )
    ).toContain('root cause');
  });

  test('extracts messages from deep root cause', () => {
    expect(
      identifyEsError(
        generateESErrorWithResponse(
          [
            {
              type: 'illegal_argument_exception',
              reason: 'root cause',
            },
            {
              type: 'illegal_argument_exception',
              reason: 'deep root cause',
            },
          ],
          {}
        )
      )
    ).toContain('deep root cause');
  });

  test('extracts messages from first caused by', () => {
    expect(
      identifyEsError(
        generateESErrorWithResponse(
          [
            {
              type: 'illegal_argument_exception',
              reason: 'root cause',
            },
            {
              type: 'illegal_argument_exception',
              reason: 'deep root cause',
            },
          ],
          {
            type: 'illegal_argument_exception',
            reason: 'first caused by',
            caused_by: {
              type: 'illegal_argument_exception',
              reason: 'second caused by',
            },
          }
        )
      )
    ).toContain('first caused by');
  });

  test('extracts messages from deep caused by', () => {
    expect(
      identifyEsError(
        generateESErrorWithResponse(
          [
            {
              type: 'illegal_argument_exception',
              reason: 'root cause',
            },
            {
              type: 'illegal_argument_exception',
              reason: 'deep root cause',
            },
          ],
          {
            type: 'illegal_argument_exception',
            reason: 'first caused by',
            caused_by: {
              type: 'illegal_argument_exception',
              reason: 'second caused by',
            },
          }
        )
      )
    ).toContain('second caused by');
  });

  test('extracts all messages in error', () => {
    expect(
      identifyEsError(
        generateESErrorWithResponse(
          [
            {
              type: 'illegal_argument_exception',
              reason: 'root cause',
            },
            {
              type: 'illegal_argument_exception',
              reason: 'deep root cause',
            },
          ],
          {
            type: 'illegal_argument_exception',
            reason: 'first caused by',
            caused_by: {
              type: 'illegal_argument_exception',
              reason: 'second caused by',
            },
          }
        )
      )
    ).toMatchInlineSnapshot(`
      Array [
        "first caused by",
        "second caused by",
        "root cause",
        "deep root cause",
      ]
    `);
  });
});

function generateESErrorWithResponse(
  rootCause: ESErrorCausedBy[] = [],
  causeBy: ESErrorCausedBy = {}
) {
  return {
    name: 'ResponseError',
    meta: {
      body: {
        error: {
          root_cause: rootCause,
          type: 'search_phase_execution_exception',
          reason: 'all shards failed',
          phase: 'query',
          grouped: true,
          failed_shards: [
            {
              shard: 0,
              index: '.kibana_task_manager_8.0.0_001',
              node: 'GJ7ekIWTT56-h-aC6Y89Gw',
              reason: {
                type: 'illegal_argument_exception',
                reason: 'cannot execute [inline] scripts',
              },
            },
          ],
          caused_by: causeBy,
        },
        status: 400,
      },
      statusCode: 400,
    },
  };
}

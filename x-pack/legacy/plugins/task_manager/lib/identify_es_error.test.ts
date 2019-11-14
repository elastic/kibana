/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { identifyEsError, ESErrorCausedBy } from './identify_es_error';

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
  return Object.assign(new Error(), {
    msg: '[illegal_argument_exception] cannot execute [inline] scripts',
    path: '/.kibana_task_manager/_update_by_query',
    query: {},
    body: '{"query":{}}',
    statusCode: 400,
    response: JSON.stringify({
      error: {
        root_cause: rootCause,
        type: 'search_phase_execution_exception',
        reason: 'all shards failed',
        phase: 'query',
        grouped: true,
        failed_shards: [
          {
            shard: 0,
            index: '.kibana_task_manager_1',
            node: '24A4QbjHSK6prvtopAKLKw',
            reason: {
              type: 'illegal_argument_exception',
              reason: 'cannot execute [inline] scripts',
            },
          },
        ],
        caused_by: causeBy,
      },
      status: 400,
    }),
  });
}

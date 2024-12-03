/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TransportResult } from '@elastic/elasticsearch';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { sanitizeBulkErrorResponse } from './sanitize_bulk_response';

// Using https://www.elastic.co/guide/en/elasticsearch/reference/8.11/docs-bulk.html
describe('sanitizeBulkErrorResponse', () => {
  test('should not modify success response', () => {
    const responseBody = {
      errors: false,
      took: 1,
      items: [
        {
          index: {
            _index: 'test',
            _id: '1',
            _version: 1,
            result: 'created',
            _shards: { total: 2, successful: 1, failed: 0 },
            status: 201,
            _seq_no: 0,
            _primary_term: 1,
          },
        },
        {
          delete: {
            _index: 'test',
            _id: '2',
            _version: 1,
            result: 'not_found',
            _shards: { total: 2, successful: 1, failed: 0 },
            status: 404,
            _seq_no: 1,
            _primary_term: 2,
          },
        },
        {
          create: {
            _index: 'test',
            _id: '3',
            _version: 1,
            result: 'created',
            _shards: { total: 2, successful: 1, failed: 0 },
            status: 201,
            _seq_no: 2,
            _primary_term: 3,
          },
        },
        {
          update: {
            _index: 'test',
            _id: '1',
            _version: 2,
            result: 'updated',
            _shards: { total: 2, successful: 1, failed: 0 },
            status: 200,
            _seq_no: 3,
            _primary_term: 4,
          },
        },
      ],
    };
    const transportResponseBody = wrapResponseBody(responseBody);

    expect(sanitizeBulkErrorResponse(responseBody)).toEqual(responseBody);
    expect(sanitizeBulkErrorResponse(transportResponseBody)).toEqual(transportResponseBody);
  });

  test('should not modify error response without field preview', () => {
    const responseBody = {
      took: 486,
      errors: true,
      items: [
        {
          update: {
            _index: 'index1',
            _id: '5',
            status: 404,
            error: {
              type: 'document_missing_exception',
              reason: '[5]: document missing',
              index_uuid: 'aAsFqTI0Tc2W0LCWgPNrOA',
              shard: '0',
              index: 'index1',
            },
          },
        },
        {
          delete: {
            _index: 'index1',
            _id: '6',
            status: 404,
            error: {
              type: 'document_missing_exception',
              reason: '[6]: document missing',
              index_uuid: 'aAsFqTI0Tc2W0LCWgPNrOA',
              shard: '0',
              index: 'index1',
            },
          },
        },
        {
          create: {
            _index: 'test',
            _id: '3',
            _version: 1,
            result: 'created',
            _shards: { total: 2, successful: 1, failed: 0 },
            status: 201,
            _seq_no: 2,
            _primary_term: 3,
          },
        },
      ],
    };
    const transportResponseBody = wrapResponseBody(responseBody);

    expect(sanitizeBulkErrorResponse(responseBody)).toEqual(responseBody);
    expect(sanitizeBulkErrorResponse(transportResponseBody)).toEqual(transportResponseBody);
  });

  test('should sanitize error response with field preview', () => {
    const responseBody = {
      took: 486,
      errors: true,
      items: [
        {
          update: {
            _index: 'index1',
            _id: '5',
            status: 404,
            error: {
              type: 'document_missing_exception',
              reason: '[5]: document missing',
              index_uuid: 'aAsFqTI0Tc2W0LCWgPNrOA',
              shard: '0',
              index: 'index1',
            },
          },
        },
        {
          update: {
            _index: 'index1',
            _id: '6',
            status: 404,
            error: {
              type: 'document_missing_exception',
              reason: '[6]: document missing',
              index_uuid: 'aAsFqTI0Tc2W0LCWgPNrOA',
              shard: '0',
              index: 'index1',
            },
          },
        },
        {
          create: {
            _index: 'index1',
            _id: '7',
            status: 404,
            error: {
              type: 'mapper_parsing_exception',
              reason:
                "failed to parse field [process.command_line] of type [wildcard] in document with id 'f0c9805be95fedbc3c99c663f7f02cc15826c122'. Preview of field's value: 'we don't want this field value to be echoed'",
              caused_by: {
                type: 'illegal_state_exception',
                reason: "Can't get text on a START_OBJECT at 1:3845",
              },
            },
          },
        },
      ],
    };
    const transportResponseBody = wrapResponseBody(responseBody);

    expect(sanitizeBulkErrorResponse(responseBody)).toEqual({
      ...responseBody,
      items: [
        responseBody.items[0],
        responseBody.items[1],
        {
          create: {
            _index: 'index1',
            _id: '7',
            status: 404,
            error: {
              type: 'mapper_parsing_exception',
              reason:
                "failed to parse field [process.command_line] of type [wildcard] in document with id 'f0c9805be95fedbc3c99c663f7f02cc15826c122'.",
              caused_by: {
                type: 'illegal_state_exception',
                reason: "Can't get text on a START_OBJECT at 1:3845",
              },
            },
          },
        },
      ],
    });
    expect(sanitizeBulkErrorResponse(transportResponseBody)).toEqual({
      ...transportResponseBody,
      body: {
        ...transportResponseBody.body,
        items: [
          transportResponseBody.body.items[0],
          transportResponseBody.body.items[1],
          {
            create: {
              _index: 'index1',
              _id: '7',
              status: 404,
              error: {
                type: 'mapper_parsing_exception',
                reason:
                  "failed to parse field [process.command_line] of type [wildcard] in document with id 'f0c9805be95fedbc3c99c663f7f02cc15826c122'.",
                caused_by: {
                  type: 'illegal_state_exception',
                  reason: "Can't get text on a START_OBJECT at 1:3845",
                },
              },
            },
          },
        ],
      },
    });
  });
});

function wrapResponseBody(
  body: estypes.BulkResponse,
  statusCode: number = 200
): TransportResult<estypes.BulkResponse, unknown> {
  return {
    body,
    statusCode,
    headers: {},
    warnings: null,
    // @ts-expect-error
    meta: {},
  };
}

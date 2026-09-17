/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { summarizeBulkErrors } from './summarize_bulk_errors';

describe('summarizeBulkErrors', () => {
  it('includes only failed items with error type/reason metadata', () => {
    const summary = JSON.parse(
      summarizeBulkErrors({
        items: [
          {
            index: {
              status: 201,
              _index: 'kb-docs',
              _id: 'ok-doc',
            },
          },
          {
            index: {
              status: 400,
              _index: 'kb-docs',
              _id: 'bad-doc',
              error: {
                type: 'mapper_parsing_exception',
                reason: 'failed to parse field [content]',
                caused_by: {
                  type: 'illegal_argument_exception',
                  reason: 'inference conflict',
                },
              },
            },
          },
        ],
      })
    );

    expect(summary).toEqual({
      failureCount: 1,
      failures: [
        {
          status: 400,
          _index: 'kb-docs',
          _id: 'bad-doc',
          error: {
            type: 'mapper_parsing_exception',
            reason: 'failed to parse field [content]',
            caused_by: {
              type: 'illegal_argument_exception',
              reason: 'inference conflict',
            },
          },
        },
      ],
    });
  });

  it('handles create, update, and delete operation keys', () => {
    const summary = JSON.parse(
      summarizeBulkErrors({
        items: [
          {
            create: {
              status: 409,
              _index: 'kb-docs',
              _id: 'create-fail',
              error: { type: 'version_conflict_engine_exception', reason: 'conflict' },
            },
          },
          {
            update: {
              status: 404,
              _index: 'kb-docs',
              _id: 'update-fail',
              error: { type: 'document_missing_exception', reason: 'missing' },
            },
          },
          {
            delete: {
              status: 404,
              _index: 'kb-docs',
              _id: 'delete-fail',
              error: { type: 'not_found', reason: 'not found' },
            },
          },
        ],
      })
    );

    expect(summary.failureCount).toBe(3);
    expect(summary.failures.map((f: { _id: string }) => f._id)).toEqual([
      'create-fail',
      'update-fail',
      'delete-fail',
    ]);
  });

  it('omits caused_by when absent', () => {
    const summary = JSON.parse(
      summarizeBulkErrors({
        items: [
          {
            index: {
              status: 400,
              _index: 'kb-docs',
              _id: 'bad-doc',
              error: {
                type: 'mapper_parsing_exception',
                reason: 'failed to parse',
              },
            },
          },
        ],
      })
    );

    expect(summary.failures[0].error).toEqual({
      type: 'mapper_parsing_exception',
      reason: 'failed to parse',
    });
    expect(summary.failures[0].error).not.toHaveProperty('caused_by');
  });

  it('returns an empty failure list when errors flag has no item errors', () => {
    const summary = JSON.parse(
      summarizeBulkErrors({
        items: [
          {
            index: {
              status: 201,
              _index: 'kb-docs',
              _id: 'ok-doc',
            },
          },
        ],
      })
    );

    expect(summary).toEqual({ failureCount: 0, failures: [] });
  });

  it('redacts Elasticsearch field-value previews from error reasons', () => {
    const raw = summarizeBulkErrors({
      items: [
        {
          index: {
            status: 400,
            _index: 'kb-docs',
            _id: 'bad-doc',
            error: {
              type: 'mapper_parsing_exception',
              reason:
                "failed to parse field [content] of type [text] in document with id 'bad-doc'. Preview of field's value: 'secret'",
              caused_by: {
                type: 'illegal_argument_exception',
                reason: "nested failure. Preview of field's value: 'nested-secret'",
              },
            },
          },
        },
      ],
    });

    expect(raw).not.toContain('secret');
    expect(raw).not.toContain('nested-secret');
    expect(raw).not.toContain(`Preview of field's value:`);

    const summary = JSON.parse(raw);
    expect(summary.failures[0].error.reason).toBe(
      "failed to parse field [content] of type [text] in document with id 'bad-doc'."
    );
    expect(summary.failures[0].error.caused_by.reason).toBe('nested failure.');
  });

  it('length-limits runaway error reasons', () => {
    const longReason = `${'x'.repeat(600)} more detail`;
    const summary = JSON.parse(
      summarizeBulkErrors({
        items: [
          {
            index: {
              status: 400,
              _index: 'kb-docs',
              _id: 'bad-doc',
              error: {
                type: 'mapper_parsing_exception',
                reason: longReason,
              },
            },
          },
        ],
      })
    );

    expect(summary.failures[0].error.reason).toHaveLength(501); // 500 + ellipsis
    expect(summary.failures[0].error.reason.endsWith('…')).toBe(true);
    expect(summary.failures[0].error.reason).not.toContain('more detail');
  });
});

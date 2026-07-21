/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import { summarizeBulkErrors } from './index_documents';

describe('summarizeBulkErrors', () => {
  it('includes only failed items with error type/reason metadata', () => {
    const response = {
      errors: true,
      items: [
        {
          index: {
            status: 201,
            _index: 'kb-security-labs',
            _id: 'ok-doc',
          },
        },
        {
          index: {
            status: 400,
            _index: 'kb-security-labs',
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
    } as BulkResponse;

    expect(JSON.parse(summarizeBulkErrors(response))).toEqual({
      failureCount: 1,
      failures: [
        {
          status: 400,
          _index: 'kb-security-labs',
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
});

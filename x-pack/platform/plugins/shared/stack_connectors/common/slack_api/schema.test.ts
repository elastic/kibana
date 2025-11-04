/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import { validateBlockkit } from './schema';

const ctx = {
  addIssue: jest.fn(),
} as unknown as z.RefinementCtx;

describe('validateBlockkit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should add error for invalid json', () => {
    validateBlockkit('', ctx);
    validateBlockkit('abc', ctx);

    expect(ctx.addIssue).toHaveBeenCalledTimes(2);
    expect(ctx.addIssue).toHaveBeenNthCalledWith(1, {
      code: 'custom',
      message: 'block kit body is not valid JSON - Unexpected end of JSON input',
    });
    expect(ctx.addIssue).toHaveBeenNthCalledWith(2, {
      code: 'custom',
      message: 'block kit body is not valid JSON - Unexpected token \'a\', "abc" is not valid JSON',
    });
  });

  test('should add error for json that does not contain the "blocks" field', () => {
    validateBlockkit(JSON.stringify({ foo: 'bar' }), ctx);
    expect(ctx.addIssue).toHaveBeenCalledTimes(1);
    expect(ctx.addIssue).toHaveBeenNthCalledWith(1, {
      code: 'custom',
      message: `block kit body must contain field \"blocks\"`,
    });
  });

  test('should add nothing for valid blockkit text', () => {
    validateBlockkit(
      JSON.stringify({
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Hello',
            },
          },
        ],
      }),
      ctx
    );
    expect(ctx.addIssue).not.toHaveBeenCalled();
  });
});

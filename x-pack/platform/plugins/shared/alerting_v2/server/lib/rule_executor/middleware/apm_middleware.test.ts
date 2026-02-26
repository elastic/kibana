/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import { ApmMiddleware } from './apm_middleware';
import { createRuleExecutionMiddlewareContext } from './test_utils';

jest.mock('@kbn/apm-utils', () => ({
  withSpan: jest.fn(<T>(_opts: unknown, cb: () => Promise<T>) => cb()),
}));

const withSpanMock = withSpan as jest.MockedFunction<typeof withSpan>;

describe('ApmSpanMiddleware', () => {
  const middleware = new ApmMiddleware();

  it('wraps next() in withSpan and returns result on success', async () => {
    const expectedResult = { type: 'continue' };
    const next = jest.fn().mockResolvedValue(expectedResult);
    const context = createRuleExecutionMiddlewareContext();

    const result = await middleware.execute(context, next);

    expect(result).toEqual(expectedResult);
    expect(next).toHaveBeenCalledTimes(1);
    expect(withSpanMock).toHaveBeenCalledTimes(1);
    expect(withSpanMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'rule_executor:test_step',
        type: 'rule_executor',
        labels: { plugin: 'alerting_v2' },
      }),
      expect.any(Function)
    );
  });
});

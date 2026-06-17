/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionFormHandlers } from './expression_form_handlers';

describe('ExpressionFormHandlers', () => {
  it('executes destroy function', () => {
    const handler = new ExpressionFormHandlers();
    handler.onDestroy(() => {
      return 'DESTROYED!';
    });
    expect(handler.destroy()).toBe('DESTROYED!');
  });
});

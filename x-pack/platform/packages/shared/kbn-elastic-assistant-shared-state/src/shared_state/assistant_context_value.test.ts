/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseAssistantContext } from '@kbn/elastic-assistant/impl/assistant_context';
import { AssistantContextValueService } from './assistant_context_value';

describe('AssistantContextValueService', () => {
  it('start returns correct object', () => {
    const service = new AssistantContextValueService();
    const result = service.start();

    expect(result).toEqual({
      setAssistantContextValue: expect.any(Function),
      getAssistantContextValue$: expect.any(Function),
    });

    const { setAssistantContextValue, getAssistantContextValue$ } = result;

    const values: Array<UseAssistantContext | undefined> = [];
    getAssistantContextValue$().subscribe((value) => {
      values.push(value);
    });

    setAssistantContextValue({ alertsIndexPattern: 'foo' } as UseAssistantContext);
    const remove = setAssistantContextValue({ alertsIndexPattern: 'bar' } as UseAssistantContext);
    remove();

    expect(values).toEqual([
      undefined,
      { alertsIndexPattern: 'foo' },
      { alertsIndexPattern: 'bar' },
      undefined,
    ]);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PromptContextService } from './prompt_contexts';
import { PromptContextTemplate } from '@kbn/elastic-assistant';

describe('PromptContextService', () => {
  it('start returns correct object', () => {
    const service = new PromptContextService();
    const result = service.start();

    expect(result).toEqual({
      setPromptContext: expect.any(Function),
      getPromptContext$: expect.any(Function),
    });
  });

  it('sets and unsets prompt context', () => {
    const service = new PromptContextService();
    const { setPromptContext, getPromptContext$ } = service.start();

    const values: Array<Record<string, PromptContextTemplate>> = [];
    getPromptContext$().subscribe((value) => {
      values.push(value);
    });

    const mockPromptContext1: Record<string, PromptContextTemplate> = {
      test1: {
        category: 'Test Context 1',
        description: 'Test description 1',
        tooltip: 'Test tooltip 1',
      },
    };

    const mockPromptContext2: Record<string, PromptContextTemplate> = {
      test2: {
        category: 'Test Context 2',
        description: 'Test description 2',
        tooltip: 'Test tooltip 2',
      },
    };

    const unset1 = setPromptContext(mockPromptContext1);
    setPromptContext(mockPromptContext2);

    unset1();

    expect(values.length).toBe(4);
    expect(values[0]).toEqual({});
    expect(values[1]).toBe(mockPromptContext1);
    expect(values[2]).toBe(mockPromptContext2);
    expect(values[3]).toEqual({});
  });

  it('stops the service correctly', () => {
    const service = new PromptContextService();
    const { getPromptContext$ } = service.start();

    let completed = false;
    getPromptContext$().subscribe({
      complete: () => {
        completed = true;
      },
    });

    service.stop();
    expect(completed).toBe(true);
  });
});

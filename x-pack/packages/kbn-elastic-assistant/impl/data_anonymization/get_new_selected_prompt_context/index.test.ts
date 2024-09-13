/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PromptContext, SelectedPromptContext } from '../../assistant/prompt_context/types';
import { mockAlertPromptContext } from '../../mock/prompt_context';
import { getNewSelectedPromptContext } from '.';

describe('getNewSelectedPromptContext', () => {
  const anonymizationFields = {
    total: 4,
    page: 1,
    perPage: 1000,
    data: [
      { field: 'field1', id: 'field1', allowed: true, anonymized: false },
      { field: 'field2', id: 'field2', allowed: true, anonymized: false },
      { field: 'field3', id: 'field3', allowed: false, anonymized: true },
      { field: 'field4', id: 'field4', allowed: false, anonymized: true },
    ],
  };

  it("returns empty `allow` and `allowReplacement` for string `rawData`, because it's not anonymized", async () => {
    const promptContext: PromptContext = {
      ...mockAlertPromptContext,
      getPromptContext: () => Promise.resolve('string data'), // not anonymized
    };

    const result = await getNewSelectedPromptContext({
      anonymizationFields,
      promptContext,
    });

    const excepted: SelectedPromptContext = {
      contextAnonymizationFields: undefined,
      promptContextId: promptContext.id,
      rawData: 'string data',
    };

    expect(result).toEqual(excepted);
  });

  it('returns `allow` and `allowReplacement` with the contents of `defaultAllow` and `defaultAllowReplacement` for object rawData, which is anonymized', async () => {
    const promptContext: PromptContext = {
      ...mockAlertPromptContext,
      getPromptContext: () => Promise.resolve({ field1: ['value1'], field2: ['value2'] }),
    };

    const excepted: SelectedPromptContext = {
      contextAnonymizationFields: {
        total: 2,
        page: 1,
        perPage: 1000,
        data: [
          { field: 'field1', id: 'field1', allowed: true, anonymized: false },
          { field: 'field2', id: 'field2', allowed: true, anonymized: false },
        ],
      },
      promptContextId: promptContext.id,
      rawData: { field1: ['value1'], field2: ['value2'] },
    };

    const result = await getNewSelectedPromptContext({
      anonymizationFields,
      promptContext,
    });

    expect(result).toEqual(excepted);
  });

  it('calls getPromptContext from the given promptContext', async () => {
    const promptContext: PromptContext = {
      ...mockAlertPromptContext,
      getPromptContext: jest.fn(() => Promise.resolve('string data')),
    };

    await getNewSelectedPromptContext({
      anonymizationFields,
      promptContext,
    });

    expect(promptContext.getPromptContext).toHaveBeenCalled();
  });
});

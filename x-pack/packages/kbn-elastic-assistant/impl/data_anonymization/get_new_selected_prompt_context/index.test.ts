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
  const defaultAllow = ['field1', 'field2'];
  const defaultAllowReplacement = ['field3', 'field4'];

  it("returns empty `allow` and `allowReplacement` for string `rawData`, because it's not anonymized", async () => {
    const promptContext: PromptContext = {
      ...mockAlertPromptContext,
      getPromptContext: () => Promise.resolve('string data'), // not anonymized
    };

    const result = await getNewSelectedPromptContext({
      defaultAllow,
      defaultAllowReplacement,
      promptContext,
    });

    const excepted: SelectedPromptContext = {
      allow: [],
      allowReplacement: [],
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
      allow: [...defaultAllow],
      allowReplacement: [...defaultAllowReplacement],
      promptContextId: promptContext.id,
      rawData: { field1: ['value1'], field2: ['value2'] },
    };

    const result = await getNewSelectedPromptContext({
      defaultAllow,
      defaultAllowReplacement,
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
      defaultAllow,
      defaultAllowReplacement,
      promptContext,
    });

    expect(promptContext.getPromptContext).toHaveBeenCalled();
  });
});

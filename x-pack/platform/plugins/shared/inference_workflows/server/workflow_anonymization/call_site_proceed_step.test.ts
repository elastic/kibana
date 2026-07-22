/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole } from '@kbn/inference-common';
import {
  INFERENCE_PROCEED_CAPABILITY_ID,
  type InferenceProceedInput,
} from '@kbn/inference-plugin/server';
import { getInferenceProceedCapability } from './capabilities';

describe('inference proceed capability', () => {
  it('receives workflow-transformed input and its call-local token map', async () => {
    const invoke = jest.fn().mockResolvedValue({ rawContent: 'TOKEN' });
    const proceed = getInferenceProceedCapability([
      { id: INFERENCE_PROCEED_CAPABILITY_ID, value: { invoke } },
    ]);
    const abortSignal = new AbortController().signal;
    const input: InferenceProceedInput = {
      system: 'protected system',
      messages: [{ role: MessageRole.User, content: 'protected TOKEN' }],
      tokenMap: { TOKEN: { original: 'secret', entityClass: 'ENTITY_NAME' } },
      abortSignal,
    };

    await expect(proceed.invoke(input)).resolves.toEqual({ rawContent: 'TOKEN' });
    expect(invoke).toHaveBeenCalledWith(input);
  });

  it('rejects a malformed capability', () => {
    expect(() =>
      getInferenceProceedCapability([
        { id: INFERENCE_PROCEED_CAPABILITY_ID, value: { invoke: 'not-a-function' } },
      ])
    ).toThrow(`Workflow capability "${INFERENCE_PROCEED_CAPABILITY_ID}" is invalid`);
  });
});

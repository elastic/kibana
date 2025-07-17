/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { PromptAPI, PromptOptions, ToolOptions, createPrompt } from '@kbn/inference-common';
import { z, ZodError } from '@kbn/zod';
import { createPromptRestApi } from './prompt';
import { lastValueFrom } from 'rxjs';
import { getMockHttpFetchStreamingResponse } from '../utils/mock_http_fetch_streaming';

const prompt = createPrompt({
  name: 'my-test-prompt',
  input: z.object({
    question: z.string(),
  }),
  description: 'My test prompt',
})
  .version({
    system: `You're a nice chatbot`,
    template: {
      mustache: {
        template: `Hello {{foo}}`,
      },
    },
    tools: {
      foo: {
        description: 'My tool',
        schema: {
          type: 'object',
          properties: {
            bar: {
              type: 'string',
            },
          },
          required: ['bar'],
        },
      },
    } as const satisfies ToolOptions['tools'],
  })
  .get();

describe('createPromptRestApi', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;
  let promptApi: PromptAPI;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
    http.fetch.mockResolvedValue({});
    // It seems createPromptRestApi returns the actual API function directly
    const factory = createPromptRestApi({ fetch: http.fetch } as any);
    promptApi = factory as PromptAPI; // Cast to PromptAPI for type safety in tests
  });

  it('calls http.fetch with the right parameters for non-streaming', async () => {
    const params = {
      connectorId: 'my-connector',
      input: {
        question: 'What is Kibana?',
      },
      prompt,
      temperature: 0.5,
    } satisfies PromptOptions;

    http.post.mockResolvedValue({});

    await promptApi({
      ...params,
      stream: false,
    });

    expect(http.fetch).toHaveBeenCalledTimes(1);
    expect(http.fetch).toHaveBeenCalledWith('/internal/inference/prompt', {
      method: 'POST',
      body: expect.any(String),
      signal: undefined,
    });

    const callBody = http.fetch.mock.lastCall!;
    const parsedBody = JSON.parse((callBody as any[])[1].body as string);
    expect(parsedBody).toEqual({
      ...omit(params, 'stream', 'prompt'),
      prompt: omit(prompt, 'input'),
    });
  });

  it('calls http.fetch with the right parameters for streaming', async () => {
    const params = {
      connectorId: 'my-connector',
      input: {
        question: 'What is Kibana?',
      },
      prompt,
      temperature: 0.5,
    };

    http.fetch.mockResolvedValue(getMockHttpFetchStreamingResponse());

    await lastValueFrom(
      promptApi({
        ...params,
        stream: true,
      })
    );

    expect(http.fetch).toHaveBeenCalledTimes(1);
    expect(http.fetch).toHaveBeenCalledWith('/internal/inference/prompt/stream', {
      body: expect.any(String),
      method: 'POST',
      asResponse: true,
      rawResponse: true,
      signal: undefined,
    });

    const callBody = http.fetch.mock.lastCall!;
    const parsedBody = JSON.parse((callBody as any[])[1].body as string);

    expect(parsedBody).toEqual({
      ...omit(params, 'stream', 'prompt'),
      prompt: omit(prompt, 'input'),
    });
  });

  it('rejects promise for non-streaming if input validation fails', async () => {
    const params = {
      connectorId: 'my-connector',
      input: {
        wrongKey: 'Invalid input',
      } as any,
      prompt,
      temperature: 0.5,
    };

    await expect(async () => {
      await promptApi(params);
    }).rejects.toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"code\\": \\"invalid_type\\",
          \\"expected\\": \\"string\\",
          \\"received\\": \\"undefined\\",
          \\"path\\": [
            \\"question\\"
          ],
          \\"message\\": \\"Required\\"
        }
      ]"
    `);
  });

  it('observable errors for streaming if input validation fails', async () => {
    const params = {
      connectorId: 'my-connector',
      modelName: 'test-model-invalid-stream',
      prompt,
      stream: false,
    } as const;

    const response = await promptApi({
      ...params,
      // @ts-expect-error input type doesn't match schema type
      input: {
        anotherWrongKey: 'foo',
      },
    }).catch((error) => {
      return error;
    });

    expect(response).toBeInstanceOf(ZodError);
    expect((response as ZodError).errors[0].path).toContain('question');
    expect(http.fetch).not.toHaveBeenCalled();
  });
});

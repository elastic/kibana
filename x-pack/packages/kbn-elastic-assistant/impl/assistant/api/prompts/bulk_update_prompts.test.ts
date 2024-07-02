/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_PROMPTS_URL_BULK_ACTION,
} from '@kbn/elastic-assistant-common';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { IToasts } from '@kbn/core-notifications-browser';
import { bulkUpdatePrompts } from './bulk_update_prompts';
import { PromptTypeEnum } from '@kbn/elastic-assistant-common/impl/schemas/prompts/bulk_crud_prompts_route.gen';

const prompt1 = {
  id: 'field1',
  content: 'Prompt 1',
  name: 'test',
  promptType: PromptTypeEnum.system,
};
const prompt2 = {
  ...prompt1,
  id: 'field2',
  content: 'Prompt 2',
  name: 'test2',
  promptType: PromptTypeEnum.system,
};
const toasts = {
  addError: jest.fn(),
};
describe('bulkUpdatePrompts', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createSetupContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createSetupContract();

    jest.clearAllMocks();
  });
  it('should send a POST request with the correct parameters and receive a successful response', async () => {
    const promptsActions = {
      create: [],
      update: [],
      delete: { ids: [] },
    };

    await bulkUpdatePrompts(httpMock, promptsActions);

    expect(httpMock.fetch).toHaveBeenCalledWith(ELASTIC_AI_ASSISTANT_PROMPTS_URL_BULK_ACTION, {
      method: 'POST',
      version: API_VERSIONS.internal.v1,
      body: JSON.stringify({
        create: [],
        update: [],
        delete: { ids: [] },
      }),
    });
  });

  it('should transform the prompts dictionary to an array of fields to create', async () => {
    const promptsActions = {
      create: [prompt1, prompt2],
      update: [],
      delete: { ids: [] },
    };

    await bulkUpdatePrompts(httpMock, promptsActions);

    expect(httpMock.fetch).toHaveBeenCalledWith(ELASTIC_AI_ASSISTANT_PROMPTS_URL_BULK_ACTION, {
      method: 'POST',
      version: API_VERSIONS.internal.v1,
      body: JSON.stringify({
        create: [prompt1, prompt2],
        update: [],
        delete: { ids: [] },
      }),
    });
  });

  it('should transform the prompts dictionary to an array of fields to update', async () => {
    const promptsActions = {
      update: [prompt1, prompt2],
      delete: { ids: [] },
    };

    await bulkUpdatePrompts(httpMock, promptsActions);

    expect(httpMock.fetch).toHaveBeenCalledWith(ELASTIC_AI_ASSISTANT_PROMPTS_URL_BULK_ACTION, {
      method: 'POST',
      version: API_VERSIONS.internal.v1,
      body: JSON.stringify({
        update: [prompt1, prompt2],
        delete: { ids: [] },
      }),
    });
  });

  it('should throw an error with the correct message when receiving an unsuccessful response', async () => {
    httpMock.fetch.mockResolvedValue({
      success: false,
      attributes: {
        errors: [
          {
            statusCode: 400,
            message: 'Error updating prompt',
            prompts: [{ id: prompt1.id, name: prompt1.content }],
          },
        ],
      },
    });
    const promptsActions = {
      create: [],
      update: [prompt1],
      delete: { ids: [] },
    };
    await bulkUpdatePrompts(httpMock, promptsActions, toasts as unknown as IToasts);
    expect(toasts.addError.mock.calls[0][0]).toEqual(
      new Error('Error message: Error updating prompt for prompt Prompt 1')
    );
  });

  it('should handle cases where result.attributes.errors is undefined', async () => {
    httpMock.fetch.mockResolvedValue({
      success: false,
      attributes: {},
    });
    const promptsActions = {
      create: [],
      update: [],
      delete: { ids: [] },
    };

    await bulkUpdatePrompts(httpMock, promptsActions, toasts as unknown as IToasts);
    expect(toasts.addError.mock.calls[0][0]).toEqual(new Error(''));
  });
});

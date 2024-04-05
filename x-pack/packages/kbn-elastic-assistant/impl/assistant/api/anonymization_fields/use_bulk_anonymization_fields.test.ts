/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
  ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION,
} from '@kbn/elastic-assistant-common';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { IToasts } from '@kbn/core-notifications-browser';
import { bulkChangeAnonymizationFields } from './use_bulk_anonymization_fields';

const anonymizationField1 = {
  id: 'conversation1',
  title: 'Anonymization field 1',
  apiConfig: { connectorId: '123' },
  replacements: [],
  category: 'default',
};
const anonymizationField2 = {
  ...anonymizationField1,
  id: 'conversation2',
  title: 'Conversation 2',
};
const toasts = {
  addError: jest.fn(),
};
describe('bulkChangeAnonymizationFields', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createSetupContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createSetupContract();

    jest.clearAllMocks();
  });
  it('should send a POST request with the correct parameters and receive a successful response', async () => {
    const anonymizationFieldsActions = {
      create: {},
      update: {},
      delete: { ids: [] },
    };

    await bulkChangeAnonymizationFields(httpMock, anonymizationFieldsActions);

    expect(httpMock.fetch).toHaveBeenCalledWith(
      ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION,
      {
        method: 'POST',
        version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
        body: JSON.stringify({
          update: [],
          create: [],
          delete: { ids: [] },
        }),
      }
    );
  });

  it('should transform the anonymization field dictionary to an array of conversations to create', async () => {
    const anonymizationFieldsActions = {
      create: {
        anonymizationField1,
        anonymizationField2,
      },
      update: {},
      delete: { ids: [] },
    };

    await bulkChangeAnonymizationFields(httpMock, anonymizationFieldsActions);

    expect(httpMock.fetch).toHaveBeenCalledWith(
      ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION,
      {
        method: 'POST',
        version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
        body: JSON.stringify({
          update: [],
          create: [anonymizationField1, anonymizationField2],
          delete: { ids: [] },
        }),
      }
    );
  });

  it('should transform the anonymization field dictionary to an array of conversations to update', async () => {
    const anonymizationFieldsActions = {
      update: {
        anonymizationField1,
        anonymizationField2,
      },
      delete: { ids: [] },
    };

    await bulkChangeAnonymizationFields(httpMock, anonymizationFieldsActions);

    expect(httpMock.fetch).toHaveBeenCalledWith(
      ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION,
      {
        method: 'POST',
        version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
        body: JSON.stringify({
          update: [anonymizationField1, anonymizationField2],
          delete: { ids: [] },
        }),
      }
    );
  });

  it('should throw an error with the correct message when receiving an unsuccessful response', async () => {
    httpMock.fetch.mockResolvedValue({
      success: false,
      attributes: {
        errors: [
          {
            statusCode: 400,
            message: 'Error updating anonymization field',
            conversations: [{ id: anonymizationField1.id, name: anonymizationField1.title }],
          },
        ],
      },
    });
    const anonymizationFieldsActions = {
      create: {},
      update: {},
      delete: { ids: [] },
    };
    await bulkChangeAnonymizationFields(
      httpMock,
      anonymizationFieldsActions,
      toasts as unknown as IToasts
    );
    expect(toasts.addError.mock.calls[0][0]).toEqual(
      new Error('Error message: Error updating anonymization field for conversation Conversation 1')
    );
  });

  it('should handle cases where result.attributes.errors is undefined', async () => {
    httpMock.fetch.mockResolvedValue({
      success: false,
      attributes: {},
    });
    const anonymizationFieldsActions = {
      create: {},
      update: {},
      delete: { ids: [] },
    };

    await bulkChangeAnonymizationFields(
      httpMock,
      anonymizationFieldsActions,
      toasts as unknown as IToasts
    );
    expect(toasts.addError.mock.calls[0][0]).toEqual(new Error(''));
  });
});

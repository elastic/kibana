/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION,
} from '@kbn/elastic-assistant-common';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { IToasts } from '@kbn/core-notifications-browser';
import { bulkUpdateAnonymizationFields } from './bulk_update_anonymization_fields';

const anonymizationField1 = {
  id: 'field1',
  field: 'Anonymization field 1',
  anonymized: true,
  allowed: true,
};
const anonymizationField2 = {
  ...anonymizationField1,
  id: 'field2',
  field: 'field 2',
};
const toasts = {
  addError: jest.fn(),
};
describe('bulkUpdateAnonymizationFields', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createSetupContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createSetupContract();

    jest.clearAllMocks();
  });
  it('should send a POST request with the correct parameters and receive a successful response', async () => {
    const anonymizationFieldsActions = {
      create: [],
      update: [],
      delete: { ids: [] },
    };

    await bulkUpdateAnonymizationFields(httpMock, anonymizationFieldsActions);

    expect(httpMock.fetch).toHaveBeenCalledWith(
      ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION,
      {
        method: 'POST',
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify({
          create: [],
          update: [],
          delete: { ids: [] },
        }),
      }
    );
  });

  it('should transform the anonymization field dictionary to an array of fields to create', async () => {
    const anonymizationFieldsActions = {
      create: [anonymizationField1, anonymizationField2],
      update: [],
      delete: { ids: [] },
    };

    await bulkUpdateAnonymizationFields(httpMock, anonymizationFieldsActions);

    expect(httpMock.fetch).toHaveBeenCalledWith(
      ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION,
      {
        method: 'POST',
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify({
          create: [anonymizationField1, anonymizationField2],
          update: [],
          delete: { ids: [] },
        }),
      }
    );
  });

  it('should transform the anonymization field dictionary to an array of fields to update', async () => {
    const anonymizationFieldsActions = {
      update: [anonymizationField1, anonymizationField2],
      delete: { ids: [] },
    };

    await bulkUpdateAnonymizationFields(httpMock, anonymizationFieldsActions);

    expect(httpMock.fetch).toHaveBeenCalledWith(
      ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION,
      {
        method: 'POST',
        version: API_VERSIONS.internal.v1,
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
            anonymization_fields: [{ id: anonymizationField1.id, name: anonymizationField1.field }],
          },
        ],
      },
    });
    const anonymizationFieldsActions = {
      create: [],
      update: [anonymizationField1],
      delete: { ids: [] },
    };
    await bulkUpdateAnonymizationFields(
      httpMock,
      anonymizationFieldsActions,
      toasts as unknown as IToasts
    );
    expect(toasts.addError.mock.calls[0][0]).toEqual(
      new Error(
        'Error message: Error updating anonymization field for anonymization field Anonymization field 1'
      )
    );
  });

  it('should handle cases where result.attributes.errors is undefined', async () => {
    httpMock.fetch.mockResolvedValue({
      success: false,
      attributes: {},
    });
    const anonymizationFieldsActions = {
      create: [],
      update: [],
      delete: { ids: [] },
    };

    await bulkUpdateAnonymizationFields(
      httpMock,
      anonymizationFieldsActions,
      toasts as unknown as IToasts
    );
    expect(toasts.addError.mock.calls[0][0]).toEqual(new Error(''));
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { request, createAxiosResponse } from '@kbn/actions-plugin/server/lib/axios_utils';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { resilientFields, incidentTypes, severity } from './mocks';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { ResilientConnector } from './resilient';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { RESILIENT_CONNECTOR_ID } from './constants';
import { PushToServiceIncidentSchema } from './schema';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';

jest.mock('axios');
jest.mock('@kbn/actions-plugin/server/lib/axios_utils', () => {
  const originalUtils = jest.requireActual('@kbn/actions-plugin/server/lib/axios_utils');
  return {
    ...originalUtils,
    request: jest.fn(),
  };
});

const requestMock = request as jest.Mock;
const TIMESTAMP = 1589391874472;
const apiUrl = 'https://resilient.elastic.co/';
const orgId = '201';
const apiKeyId = 'keyId';
const apiKeySecret = 'secret';
const ignoredRequestFields = {
  axios: undefined,
  timeout: undefined,
  configurationUtilities: expect.anything(),
  logger: expect.anything(),
};
const token = Buffer.from(apiKeyId + ':' + apiKeySecret, 'utf8').toString('base64');
const mockIncidentUpdate = (withUpdateError = false) => {
  requestMock.mockImplementationOnce(() =>
    createAxiosResponse({
      data: {
        id: '1',
        name: 'title',
        description: {
          format: 'html',
          content: 'description',
        },
        incident_type_ids: [1001, 16, 12],
        severity_code: 6,
        inc_last_modified_date: 1589391874472,
      },
    })
  );

  if (withUpdateError) {
    requestMock.mockImplementationOnce(() => {
      throw new Error('An error has occurred');
    });
  } else {
    requestMock.mockImplementationOnce(() =>
      createAxiosResponse({
        data: {
          success: true,
          id: '1',
          inc_last_modified_date: 1589391874472,
        },
      })
    );
  }

  requestMock.mockImplementationOnce(() =>
    createAxiosResponse({
      data: {
        id: '1',
        name: 'title_updated',
        description: {
          format: 'html',
          content: 'desc_updated',
        },
        inc_last_modified_date: 1589391874472,
      },
    })
  );
};
let connectorUsageCollector: ConnectorUsageCollector;

describe('IBM Resilient connector', () => {
  const logger = loggingSystemMock.createLogger();
  const connector = new ResilientConnector(
    {
      connector: { id: '1', type: RESILIENT_CONNECTOR_ID },
      configurationUtilities: actionsConfigMock.create(),
      logger,
      services: actionsMock.createServices(),
      config: { orgId, apiUrl },
      secrets: { apiKeyId, apiKeySecret },
    },
    PushToServiceIncidentSchema
  );
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.setSystemTime(TIMESTAMP);
    connectorUsageCollector = new ConnectorUsageCollector({
      logger,
      connectorId: 'test-connector-id',
    });
  });

  describe('getIncident', () => {
    const incidentMock = {
      id: '1',
      name: '1',
      description: {
        format: 'html',
        content: 'description',
      },
      inc_last_modified_date: TIMESTAMP,
    };

    beforeEach(() => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({
          data: incidentMock,
        })
      );
    });

    it('returns the incident correctly', async () => {
      const res = await connector.getIncident({ id: '1' }, connectorUsageCollector);
      expect(res).toEqual(incidentMock);
    });

    it('should call request with correct arguments', async () => {
      await connector.getIncident({ id: '1' }, connectorUsageCollector);
      expect(requestMock).toHaveBeenCalledWith({
        ...ignoredRequestFields,
        method: 'GET',
        data: {},
        url: `${apiUrl}rest/orgs/${orgId}/incidents/1`,
        headers: {
          Authorization: `Basic ${token}`,
          'Content-Type': 'application/json',
        },
        params: {
          text_content_output_format: 'objects_convert',
        },
        connectorUsageCollector,
      });
    });

    it('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });
      await expect(connector.getIncident({ id: '1' }, connectorUsageCollector)).rejects.toThrow(
        'Unable to get incident with id 1. Error: An error has occurred'
      );
    });
  });

  describe('createIncident', () => {
    const incidentMock = {
      name: 'title',
      description: 'desc',
      incidentTypes: [1001],
      severityCode: 6,
    };

    beforeEach(() => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({
          data: {
            id: '1',
            name: 'title',
            description: 'description',
            discovered_date: 1589391874472,
            create_date: 1589391874472,
          },
        })
      );
    });

    it('creates the incident correctly', async () => {
      const res = await connector.createIncident(incidentMock, connectorUsageCollector);

      expect(res).toEqual({
        title: '1',
        id: '1',
        pushedDate: '2020-05-13T17:44:34.472Z',
        url: 'https://resilient.elastic.co/#incidents/1',
      });
    });

    it('should call request with correct arguments', async () => {
      await connector.createIncident(incidentMock, connectorUsageCollector);

      expect(requestMock).toHaveBeenCalledWith({
        ...ignoredRequestFields,
        method: 'POST',
        data: {
          name: 'title',
          description: {
            format: 'html',
            content: 'desc',
          },
          discovered_date: TIMESTAMP,
          incident_type_ids: [{ id: 1001 }],
          severity_code: { id: 6 },
        },
        url: `${apiUrl}rest/orgs/${orgId}/incidents?text_content_output_format=objects_convert`,
        headers: {
          Authorization: `Basic ${token}`,
          'Content-Type': 'application/json',
        },
        connectorUsageCollector,
      });
    });

    it('should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });

      await expect(
        connector.createIncident(
          {
            name: 'title',
            description: 'desc',
            incidentTypes: [1001],
            severityCode: 6,
          },
          connectorUsageCollector
        )
      ).rejects.toThrow(
        '[Action][IBM Resilient]: Unable to create incident. Error: An error has occurred'
      );
    });

    it('should throw if the required attributes are not received in response', async () => {
      requestMock.mockImplementation(() => createAxiosResponse({ data: { notRequired: 'test' } }));

      await expect(connector.createIncident(incidentMock, connectorUsageCollector)).rejects.toThrow(
        '[Action][IBM Resilient]: Unable to create incident. Error: Response validation failed (Error: [id]: expected value of type [number] but got [undefined]).'
      );
    });
  });

  describe('updateIncident', () => {
    const req = {
      incidentId: '1',
      incident: {
        name: 'title',
        description: 'desc',
        incidentTypes: [1001],
        severityCode: 6,
      },
    };
    it('updates the incident correctly', async () => {
      mockIncidentUpdate();
      const res = await connector.updateIncident(req, connectorUsageCollector);

      expect(res).toEqual({
        title: '1',
        id: '1',
        pushedDate: '2020-05-13T17:44:34.472Z',
        url: 'https://resilient.elastic.co/#incidents/1',
      });
    });

    it('should call request with correct arguments', async () => {
      mockIncidentUpdate();

      await connector.updateIncident(
        {
          incidentId: '1',
          incident: {
            name: 'title_updated',
            description: 'desc_updated',
            incidentTypes: [1001],
            severityCode: 5,
          },
        },
        connectorUsageCollector
      );

      expect(requestMock.mock.calls[1][0]).toEqual({
        ...ignoredRequestFields,
        url: `${apiUrl}rest/orgs/${orgId}/incidents/1`,
        headers: {
          Authorization: `Basic ${token}`,
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
        data: {
          changes: [
            {
              field: { name: 'name' },
              old_value: { text: 'title' },
              new_value: { text: 'title_updated' },
            },
            {
              field: { name: 'description' },
              old_value: {
                textarea: {
                  content: 'description',
                  format: 'html',
                },
              },
              new_value: {
                textarea: {
                  content: 'desc_updated',
                  format: 'html',
                },
              },
            },
            {
              field: {
                name: 'incident_type_ids',
              },
              old_value: {
                ids: [1001, 16, 12],
              },
              new_value: {
                ids: [1001],
              },
            },
            {
              field: {
                name: 'severity_code',
              },
              old_value: {
                id: 6,
              },
              new_value: {
                id: 5,
              },
            },
          ],
        },
        connectorUsageCollector,
      });
    });

    it('it should throw an error', async () => {
      mockIncidentUpdate(true);

      await expect(connector.updateIncident(req, connectorUsageCollector)).rejects.toThrow(
        '[Action][IBM Resilient]: Unable to update incident with id 1. Error: An error has occurred'
      );
    });

    it('should throw if the required attributes are not received in response', async () => {
      requestMock.mockImplementationOnce(() =>
        createAxiosResponse({
          data: {
            id: '1',
            name: 'title',
            description: {
              format: 'html',
              content: 'description',
            },
            incident_type_ids: [1001, 16, 12],
            severity_code: 6,
            inc_last_modified_date: 1589391874472,
          },
        })
      );
      requestMock.mockImplementation(() => createAxiosResponse({ data: { notRequired: 'test' } }));

      await expect(connector.updateIncident(req, connectorUsageCollector)).rejects.toThrow(
        '[Action][IBM Resilient]: Unable to update incident with id 1. Error: Response validation failed (Error: [success]: expected value of type [boolean] but got [undefined]).'
      );
    });
  });

  describe('createComment', () => {
    const req = {
      incidentId: '1',
      comment: 'comment',
    };

    beforeEach(() => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({
          data: {
            id: '1',
            create_date: 1589391874472,
            comment: {
              id: '5',
            },
          },
        })
      );
    });

    it('should call request with correct arguments', async () => {
      await connector.addComment(req, connectorUsageCollector);

      expect(requestMock).toHaveBeenCalledWith({
        ...ignoredRequestFields,
        url: `${apiUrl}rest/orgs/${orgId}/incidents/1/comments`,
        headers: {
          Authorization: `Basic ${token}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        data: {
          text: {
            content: 'comment',
            format: 'text',
          },
        },
        connectorUsageCollector,
      });
    });

    it('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });

      await expect(connector.addComment(req, connectorUsageCollector)).rejects.toThrow(
        '[Action][IBM Resilient]: Unable to create comment at incident with id 1. Error: An error has occurred.'
      );
    });
  });

  describe('getIncidentTypes', () => {
    beforeEach(() => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({
          data: incidentTypes,
        })
      );
    });

    it('should call request with correct arguments', async () => {
      await connector.getIncidentTypes(undefined, connectorUsageCollector);
      expect(requestMock).toBeCalledTimes(1);
      expect(requestMock).toHaveBeenCalledWith({
        ...ignoredRequestFields,
        method: 'GET',
        data: {},
        url: `${apiUrl}rest/orgs/${orgId}/types/incident/fields/incident_type_ids`,
        headers: {
          Authorization: `Basic ${token}`,
          'Content-Type': 'application/json',
        },
        connectorUsageCollector,
      });
    });

    it('returns incident types correctly', async () => {
      const res = await connector.getIncidentTypes(undefined, connectorUsageCollector);

      expect(res).toEqual([
        { id: '17', name: 'Communication error (fax; email)' },
        { id: '1001', name: 'Custom type' },
      ]);
    });

    it('should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });

      await expect(connector.getIncidentTypes(undefined, connectorUsageCollector)).rejects.toThrow(
        '[Action][IBM Resilient]: Unable to get incident types. Error: An error has occurred.'
      );
    });

    it('should throw if the required attributes are not received in response', async () => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({ data: { id: '1001', name: 'Custom type' } })
      );

      await expect(connector.getIncidentTypes(undefined, connectorUsageCollector)).rejects.toThrow(
        '[Action][IBM Resilient]: Unable to get incident types. Error: Response validation failed (Error: [values]: expected value of type [array] but got [undefined]).'
      );
    });
  });

  describe('getSeverity', () => {
    beforeEach(() => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({
          data: {
            values: severity,
          },
        })
      );
    });

    it('should call request with correct arguments', async () => {
      await connector.getSeverity(undefined, connectorUsageCollector);
      expect(requestMock).toBeCalledTimes(1);
      expect(requestMock).toHaveBeenCalledWith({
        ...ignoredRequestFields,
        method: 'GET',
        data: {},
        url: `${apiUrl}rest/orgs/${orgId}/types/incident/fields/severity_code`,
        headers: {
          Authorization: `Basic ${token}`,
          'Content-Type': 'application/json',
        },
        connectorUsageCollector,
      });
    });

    it('returns severity correctly', async () => {
      const res = await connector.getSeverity(undefined, connectorUsageCollector);

      expect(res).toEqual([
        {
          id: '4',
          name: 'Low',
        },
        {
          id: '5',
          name: 'Medium',
        },
        {
          id: '6',
          name: 'High',
        },
      ]);
    });

    it('should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });

      await expect(connector.getSeverity(undefined, connectorUsageCollector)).rejects.toThrow(
        '[Action][IBM Resilient]: Unable to get severity. Error: An error has occurred.'
      );
    });

    it('should throw if the required attributes are not received in response', async () => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({ data: { id: '10', name: 'Critical' } })
      );

      await expect(connector.getSeverity(undefined, connectorUsageCollector)).rejects.toThrow(
        '[Action][IBM Resilient]: Unable to get severity. Error: Response validation failed (Error: [values]: expected value of type [array] but got [undefined]).'
      );
    });
  });

  describe('getFields', () => {
    beforeEach(() => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({
          data: resilientFields,
        })
      );
    });
    it('should call request with correct arguments', async () => {
      await connector.getFields(undefined, connectorUsageCollector);

      expect(requestMock).toBeCalledTimes(1);
      expect(requestMock).toHaveBeenCalledWith({
        ...ignoredRequestFields,
        method: 'GET',
        data: {},
        url: `${apiUrl}rest/orgs/${orgId}/types/incident/fields`,
        headers: {
          Authorization: `Basic ${token}`,
          'Content-Type': 'application/json',
        },
        connectorUsageCollector,
      });
    });

    it('returns common fields correctly', async () => {
      const res = await connector.getFields(undefined, connectorUsageCollector);
      expect(res).toEqual(resilientFields);
    });

    it('should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });
      await expect(connector.getFields(undefined, connectorUsageCollector)).rejects.toThrow(
        'Unable to get fields. Error: An error has occurred'
      );
    });

    it('should throw if the required attributes are not received in response', async () => {
      requestMock.mockImplementation(() => createAxiosResponse({ data: { someField: 'test' } }));

      await expect(connector.getFields(undefined, connectorUsageCollector)).rejects.toThrow(
        '[Action][IBM Resilient]: Unable to get fields. Error: Response validation failed (Error: expected value of type [array] but got [Object]).'
      );
    });
  });
});

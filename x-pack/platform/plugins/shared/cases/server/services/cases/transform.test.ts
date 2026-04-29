/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { SavedObjectReference } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';

import {
  basicESCaseFields,
  createCaseSavedObjectResponse,
  createESJiraConnector,
  createExternalService,
  createJiraConnector,
} from '../test_utils';
import {
  transformAttributesToESModel,
  transformESModelToCase,
  transformSavedObjectToExternalModel,
  transformUpdateResponseToExternalModel,
} from './transform';
import { ACTION_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server';
import {
  CONNECTOR_ID_REFERENCE_NAME,
  PUSH_CONNECTOR_ID_REFERENCE_NAME,
} from '../../common/constants';
import { getNoneCaseConnector } from '../../common/utils';
import type { CasePersistedAttributes } from '../../common/types/case';
import { CasePersistedSeverity, CasePersistedStatus } from '../../common/types/case';
import { CaseSeverity, CaseStatuses, ConnectorTypes } from '../../../common/types/domain';

describe('case transforms', () => {
  describe('transformUpdateResponseToExternalModel', () => {
    it('does not return the connector field if it is undefined', () => {
      expect(
        transformUpdateResponseToExternalModel({
          type: 'a',
          id: '1',
          attributes: {},
          references: undefined,
        }).attributes
      ).not.toHaveProperty('connector');
    });

    it('does not return the external_service field if it is undefined', () => {
      expect(
        transformUpdateResponseToExternalModel({
          type: 'a',
          id: '1',
          attributes: {},
          references: undefined,
        }).attributes
      ).not.toHaveProperty('external_service');
    });

    it('return a null external_service field if it is null', () => {
      expect(
        transformUpdateResponseToExternalModel({
          type: 'a',
          id: '1',
          attributes: {
            external_service: null,
          },
          references: undefined,
        }).attributes.external_service
      ).toBeNull();
    });

    it('return none external_service.connector_id field if it is none', () => {
      expect(
        transformUpdateResponseToExternalModel({
          type: 'a',
          id: '1',
          attributes: {
            external_service: createExternalService({ connector_id: 'none' }),
          },
          references: undefined,
        }).attributes.external_service?.connector_id
      ).toBe('none');
    });

    it('return the external_service fields if it is populated', () => {
      const { connector_id: ignore, ...restExternalService } = createExternalService()!;
      expect(
        transformUpdateResponseToExternalModel({
          type: 'a',
          id: '1',
          attributes: {
            external_service: restExternalService,
          },
          references: undefined,
        }).attributes.external_service
      ).toMatchInlineSnapshot(`
        Object {
          "connector_id": "none",
          "connector_name": ".jira",
          "external_id": "100",
          "external_title": "awesome",
          "external_url": "http://www.google.com",
          "pushed_at": "2019-11-25T21:54:48.952Z",
          "pushed_by": Object {
            "email": "testemail@elastic.co",
            "full_name": "elastic",
            "username": "elastic",
          },
        }
      `);
    });

    it('populates the connector_id field when it finds a reference', () => {
      expect(
        transformUpdateResponseToExternalModel({
          type: 'a',
          id: '1',
          attributes: {
            external_service: createExternalService(),
          },
          references: [
            { id: '1', name: PUSH_CONNECTOR_ID_REFERENCE_NAME, type: ACTION_SAVED_OBJECT_TYPE },
          ],
        }).attributes.external_service?.connector_id
      ).toMatchInlineSnapshot(`"1"`);
    });

    it('populates the external_service fields when it finds a reference', () => {
      expect(
        transformUpdateResponseToExternalModel({
          type: 'a',
          id: '1',
          attributes: {
            external_service: createExternalService(),
          },
          references: [
            { id: '1', name: PUSH_CONNECTOR_ID_REFERENCE_NAME, type: ACTION_SAVED_OBJECT_TYPE },
          ],
        }).attributes.external_service
      ).toMatchInlineSnapshot(`
        Object {
          "connector_id": "1",
          "connector_name": ".jira",
          "external_id": "100",
          "external_title": "awesome",
          "external_url": "http://www.google.com",
          "pushed_at": "2019-11-25T21:54:48.952Z",
          "pushed_by": Object {
            "email": "testemail@elastic.co",
            "full_name": "elastic",
            "username": "elastic",
          },
        }
      `);
    });

    it('populates the connector fields when it finds a reference', () => {
      expect(
        transformUpdateResponseToExternalModel({
          type: 'a',
          id: '1',
          attributes: {
            connector: {
              name: ConnectorTypes.jira,
              type: ConnectorTypes.jira,
              fields: [{ key: 'issueType', value: 'bug' }],
            },
          },
          references: [
            { id: '1', name: CONNECTOR_ID_REFERENCE_NAME, type: ACTION_SAVED_OBJECT_TYPE },
          ],
        }).attributes.connector
      ).toMatchInlineSnapshot(`
        Object {
          "fields": Object {
            "issueType": "bug",
          },
          "id": "1",
          "name": ".jira",
          "type": ".jira",
        }
      `);
    });

    it('returns the none connector when it cannot find the reference', () => {
      expect(
        transformUpdateResponseToExternalModel({
          type: 'a',
          id: '1',
          attributes: {
            connector: {
              name: ConnectorTypes.jira,
              type: ConnectorTypes.jira,
              fields: [{ key: 'issueType', value: 'bug' }],
            },
          },
          references: undefined,
        }).attributes.connector
      ).toMatchInlineSnapshot(`
        Object {
          "fields": null,
          "id": "none",
          "name": "none",
          "type": ".none",
        }
      `);
    });

    it.each([
      [CasePersistedSeverity.LOW, CaseSeverity.LOW],
      [CasePersistedSeverity.MEDIUM, CaseSeverity.MEDIUM],
      [CasePersistedSeverity.HIGH, CaseSeverity.HIGH],
      [CasePersistedSeverity.CRITICAL, CaseSeverity.CRITICAL],
    ])(
      'properly converts "%s" severity to corresponding external value "%s"',
      (internalSeverityValue, expectedSeverityValue) => {
        const transformedResponse = transformUpdateResponseToExternalModel({
          type: 'a',
          id: '1',
          attributes: {
            severity: internalSeverityValue,
          },
          references: undefined,
        });

        expect(transformedResponse.attributes).toHaveProperty('severity');
        expect(transformedResponse.attributes.severity).toBe(expectedSeverityValue);
      }
    );

    it.each([
      [CasePersistedStatus.OPEN, CaseStatuses.open],
      [CasePersistedStatus.IN_PROGRESS, CaseStatuses['in-progress']],
      [CasePersistedStatus.CLOSED, CaseStatuses.closed],
    ])(
      'properly converts "%s" status to corresponding ES Value "%s"',
      (internalStatusValue, expectedStatusValue) => {
        const transformedAttributes = transformUpdateResponseToExternalModel({
          type: 'a',
          id: '1',
          attributes: {
            status: internalStatusValue,
          },
          references: undefined,
        });

        expect(transformedAttributes.attributes).toHaveProperty('status');
        expect(transformedAttributes.attributes.status).toBe(expectedStatusValue);
      }
    );

    it('does not return the total alerts', () => {
      expect(
        transformUpdateResponseToExternalModel({
          type: 'a',
          id: '1',
          attributes: { total_alerts: 2 },
          references: undefined,
        }).attributes
      ).not.toHaveProperty('total_alerts');
    });

    it('does not return the total comments', () => {
      expect(
        transformUpdateResponseToExternalModel({
          type: 'a',
          id: '1',
          attributes: { total_comments: 2 },
          references: undefined,
        }).attributes
      ).not.toHaveProperty('total_comments');
    });
  });

  describe('transformAttributesToESModel', () => {
    it('does not return the external_service field when it is undefined', () => {
      expect(
        transformAttributesToESModel({
          external_service: undefined,
        }).attributes
      ).not.toHaveProperty('external_service');
    });

    it('creates an undefined reference when external_service is undefined and the original reference is undefined', () => {
      expect(
        transformAttributesToESModel({
          external_service: undefined,
        }).referenceHandler.build()
      ).toBeUndefined();
    });

    it('returns a null external_service when it is null', () => {
      expect(
        transformAttributesToESModel({
          external_service: null,
        }).attributes.external_service
      ).toBeNull();
    });

    it('creates an undefined reference when external_service is null and the original reference is undefined', () => {
      expect(
        transformAttributesToESModel({
          external_service: null,
        }).referenceHandler.build()
      ).toBeUndefined();
    });

    it('returns the external_service fields except for the connector_id', () => {
      const transformedAttributes = transformAttributesToESModel({
        external_service: createExternalService(),
      });

      expect(transformedAttributes.attributes).toMatchInlineSnapshot(`
        Object {
          "external_service": Object {
            "connector_name": ".jira",
            "external_id": "100",
            "external_title": "awesome",
            "external_url": "http://www.google.com",
            "pushed_at": "2019-11-25T21:54:48.952Z",
            "pushed_by": Object {
              "email": "testemail@elastic.co",
              "full_name": "elastic",
              "username": "elastic",
            },
          },
          "total_observables": 0,
        }
      `);
      expect(transformedAttributes.attributes.external_service).not.toHaveProperty('connector_id');
      expect(transformedAttributes.referenceHandler.build()).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "100",
            "name": "pushConnectorId",
            "type": "action",
          },
        ]
      `);
    });

    it('creates an empty references array to delete the connector_id when connector_id is null and the original references is undefined', () => {
      const transformedAttributes = transformAttributesToESModel({
        external_service: createExternalService({ connector_id: 'none' }),
      });

      expect(transformedAttributes.referenceHandler.build()).toEqual([]);
    });

    it('does not return the connector when it is undefined', () => {
      expect(transformAttributesToESModel({ connector: undefined }).attributes).not.toHaveProperty(
        'connector'
      );
    });

    it('constructs an undefined reference when the connector is undefined and the original reference is undefined', () => {
      expect(
        transformAttributesToESModel({ connector: undefined }).referenceHandler.build()
      ).toBeUndefined();
    });

    it('returns a jira connector', () => {
      const transformedAttributes = transformAttributesToESModel({
        connector: createJiraConnector(),
      });

      expect(transformedAttributes.attributes).toMatchInlineSnapshot(`
        Object {
          "connector": Object {
            "fields": Array [
              Object {
                "key": "issueType",
                "value": "bug",
              },
              Object {
                "key": "priority",
                "value": "high",
              },
              Object {
                "key": "parent",
                "value": "2",
              },
            ],
            "name": ".jira",
            "type": ".jira",
          },
          "total_observables": 0,
        }
      `);
      expect(transformedAttributes.attributes.connector).not.toHaveProperty('id');
      expect(transformedAttributes.referenceHandler.build()).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "1",
            "name": "connectorId",
            "type": "action",
          },
        ]
      `);
    });

    it('returns a none connector without a reference', () => {
      const transformedAttributes = transformAttributesToESModel({
        connector: getNoneCaseConnector(),
      });

      expect(transformedAttributes.attributes).toMatchInlineSnapshot(`
        Object {
          "connector": Object {
            "fields": Array [],
            "name": "none",
            "type": ".none",
          },
          "total_observables": 0,
        }
      `);
      expect(transformedAttributes.attributes.connector).not.toHaveProperty('id');
      expect(transformedAttributes.referenceHandler.build()).toEqual([]);
    });

    it.each([
      [CaseSeverity.LOW, CasePersistedSeverity.LOW],
      [CaseSeverity.MEDIUM, CasePersistedSeverity.MEDIUM],
      [CaseSeverity.HIGH, CasePersistedSeverity.HIGH],
      [CaseSeverity.CRITICAL, CasePersistedSeverity.CRITICAL],
    ])(
      'properly converts "%s" severity to corresponding ES Value "%s"',
      (externalSeverityValue, expectedSeverityValue) => {
        const transformedAttributes = transformAttributesToESModel({
          severity: externalSeverityValue,
        });

        expect(transformedAttributes.attributes).toHaveProperty('severity');
        expect(transformedAttributes.attributes.severity).toBe(expectedSeverityValue);
      }
    );

    it('does not return the severity when it is undefined', () => {
      expect(transformAttributesToESModel({ severity: undefined }).attributes).not.toHaveProperty(
        'severity'
      );
    });

    it.each([
      [CaseStatuses.open, CasePersistedStatus.OPEN],
      [CaseStatuses['in-progress'], CasePersistedStatus.IN_PROGRESS],
      [CaseStatuses.closed, CasePersistedStatus.CLOSED],
    ])(
      'properly converts "%s" status to corresponding ES Value "%s"',
      (externalStatusValue, expectedStatusValue) => {
        const transformedAttributes = transformAttributesToESModel({
          status: externalStatusValue,
        });

        expect(transformedAttributes.attributes).toHaveProperty('status');
        expect(transformedAttributes.attributes.status).toBe(expectedStatusValue);
      }
    );

    it('does not return the status when it is undefined', () => {
      expect(transformAttributesToESModel({ status: undefined }).attributes).not.toHaveProperty(
        'status'
      );
    });

    it('removes the incremental_id property', () => {
      expect(transformAttributesToESModel({ incremental_id: 100 }).attributes).not.toHaveProperty(
        'incremental_id'
      );
    });

    it('does not remove the total alerts', () => {
      expect(transformAttributesToESModel({ total_alerts: 10 }).attributes).toMatchInlineSnapshot(`
        Object {
          "total_alerts": 10,
          "total_observables": 0,
        }
      `);
    });

    it('does not remove the total comments', () => {
      expect(transformAttributesToESModel({ total_comments: 5 }).attributes).toMatchInlineSnapshot(`
        Object {
          "total_comments": 5,
          "total_observables": 0,
        }
      `);
    });
  });

  describe('transformSavedObjectToExternalModel', () => {
    it('returns the default none connector when it cannot find the reference', () => {
      expect(
        transformSavedObjectToExternalModel(
          createCaseSavedObjectResponse({ connector: getNoneCaseConnector() })
        ).attributes.connector
      ).toMatchInlineSnapshot(`
        Object {
          "fields": null,
          "id": "none",
          "name": "none",
          "type": ".none",
        }
      `);
    });

    it('returns a jira connector', () => {
      expect(
        transformSavedObjectToExternalModel(
          createCaseSavedObjectResponse({ connector: createESJiraConnector() })
        ).attributes.connector
      ).toMatchInlineSnapshot(`
        Object {
          "fields": Object {
            "issueType": "bug",
            "parent": "2",
            "priority": "high",
          },
          "id": "1",
          "name": ".jira",
          "type": ".jira",
        }
      `);
    });

    it('sets external_service to null when it is null', () => {
      expect(
        transformSavedObjectToExternalModel(
          createCaseSavedObjectResponse({ externalService: null })
        ).attributes.external_service
      ).toBeNull();
    });

    it('sets external_service.connector_id to none when a reference cannot be found', () => {
      const transformedSO = transformSavedObjectToExternalModel(
        createCaseSavedObjectResponse({
          externalService: createExternalService({ connector_id: 'none' }),
        })
      );

      expect(transformedSO.attributes.external_service?.connector_id).toBe('none');
      expect(transformedSO.attributes.external_service).toMatchInlineSnapshot(`
        Object {
          "connector_id": "none",
          "connector_name": ".jira",
          "external_id": "100",
          "external_title": "awesome",
          "external_url": "http://www.google.com",
          "pushed_at": "2019-11-25T21:54:48.952Z",
          "pushed_by": Object {
            "email": "testemail@elastic.co",
            "full_name": "elastic",
            "username": "elastic",
          },
        }
      `);
    });

    it.each([
      [CasePersistedSeverity.LOW, CaseSeverity.LOW],
      [CasePersistedSeverity.MEDIUM, CaseSeverity.MEDIUM],
      [CasePersistedSeverity.HIGH, CaseSeverity.HIGH],
      [CasePersistedSeverity.CRITICAL, CaseSeverity.CRITICAL],
    ])(
      'properly converts "%s" severity to corresponding external value "%s"',
      (internalSeverityValue, expectedSeverityValue) => {
        const caseSO = createCaseSavedObjectResponse({
          overrides: { severity: internalSeverityValue },
        });

        expect(caseSO.attributes).toHaveProperty('severity');
        expect(caseSO.attributes.severity).toBe(internalSeverityValue);

        const transformedSO = transformSavedObjectToExternalModel(caseSO);

        expect(transformedSO.attributes).toHaveProperty('severity');
        expect(transformedSO.attributes.severity).toBe(expectedSeverityValue);
      }
    );

    it('does not return the severity when it is undefined', () => {
      expect(transformAttributesToESModel({ severity: undefined }).attributes).not.toHaveProperty(
        'severity'
      );
    });

    it.each([
      [CasePersistedStatus.OPEN, CaseStatuses.open],
      [CasePersistedStatus.IN_PROGRESS, CaseStatuses['in-progress']],
      [CasePersistedStatus.CLOSED, CaseStatuses.closed],
    ])(
      'properly converts "%s" status to corresponding external value "%s"',
      (internalStatusValue, expectedStatusValue) => {
        const caseSO = createCaseSavedObjectResponse({
          overrides: { status: internalStatusValue },
        });

        expect(caseSO.attributes).toHaveProperty('status');
        expect(caseSO.attributes.status).toBe(internalStatusValue);

        const transformedSO = transformSavedObjectToExternalModel(caseSO);

        expect(transformedSO.attributes).toHaveProperty('status');
        expect(transformedSO.attributes.status).toBe(expectedStatusValue);
      }
    );

    it('does not return the status when it is undefined', () => {
      expect(transformAttributesToESModel({ status: undefined }).attributes).not.toHaveProperty(
        'status'
      );
    });

    it('returns the default value for category when it is undefined', () => {
      const CaseSOResponseWithoutCategory = omit(createCaseSavedObjectResponse(), 'category');

      expect(
        transformSavedObjectToExternalModel(CaseSOResponseWithoutCategory).attributes.category
      ).toBe(null);
    });

    it('returns the correct value for category when it is null', () => {
      const CaseSOResponseWithoutCategory = createCaseSavedObjectResponse();

      expect(
        transformSavedObjectToExternalModel(CaseSOResponseWithoutCategory).attributes.category
      ).toBe(null);
    });

    it('returns the correct value for category when it is defined', () => {
      const CaseSOResponseWithoutCategory = createCaseSavedObjectResponse({
        overrides: { category: 'foobar' },
      });

      expect(
        transformSavedObjectToExternalModel(CaseSOResponseWithoutCategory).attributes.category
      ).toBe('foobar');
    });

    it('returns observables array when it is defined', () => {
      const CaseSOResponseWithObservables = createCaseSavedObjectResponse({
        overrides: {
          observables: [
            {
              id: '27318f00-334b-44b1-b29c-0cfaefbeeb8a',
              value: 'test',
              typeKey: 'c661b01e-24f5-44aa-a172-d5d219cd1bd4',
              createdAt: '2024-11-07',
              updatedAt: '2024-11-07',
              description: '',
            },
          ],
        },
      });

      expect(
        transformSavedObjectToExternalModel(CaseSOResponseWithObservables).attributes.observables
      ).toMatchInlineSnapshot(`
        Array [
          Object {
            "createdAt": "2024-11-07",
            "description": "",
            "id": "27318f00-334b-44b1-b29c-0cfaefbeeb8a",
            "typeKey": "c661b01e-24f5-44aa-a172-d5d219cd1bd4",
            "updatedAt": "2024-11-07",
            "value": "test",
          },
        ]
      `);
    });

    it('returns observables array when it is not defined', () => {
      const CaseSOResponseWithObservables = createCaseSavedObjectResponse({
        overrides: {
          observables: undefined,
        },
      });

      expect(
        transformSavedObjectToExternalModel(CaseSOResponseWithObservables).attributes.observables
      ).toMatchInlineSnapshot(`Array []`);
    });

    it('returns incremental_id when it is defined', () => {
      const CaseSOResponseWithObservables = createCaseSavedObjectResponse({
        overrides: {
          incremental_id: 100,
        },
      });

      expect(
        transformSavedObjectToExternalModel(CaseSOResponseWithObservables).attributes.incremental_id
      ).toBe(100);
    });

    it('returns undefined for `inceremental_id` when it is not defined', () => {
      const CaseSOResponseWithObservables = createCaseSavedObjectResponse({
        overrides: {
          incremental_id: undefined,
        },
      });

      expect(
        transformSavedObjectToExternalModel(CaseSOResponseWithObservables).attributes.incremental_id
      ).not.toBeDefined();
    });

    it('returns the correct value for extractObservables when it is defined', () => {
      const CaseSOResponseWithObservables = createCaseSavedObjectResponse({
        overrides: {
          settings: {
            syncAlerts: true,
            extractObservables: true,
          },
        },
      });
      expect(
        transformSavedObjectToExternalModel(CaseSOResponseWithObservables).attributes.settings
          .extractObservables
      ).toBe(true);
    });

    it('returns false for extractObservables when it is not defined', () => {
      const CaseSOResponseWithObservables = createCaseSavedObjectResponse({
        overrides: {
          settings: {
            syncAlerts: true,
            extractObservables: undefined,
          },
        },
      });
      expect(
        transformSavedObjectToExternalModel(CaseSOResponseWithObservables).attributes.settings
          .extractObservables
      ).toBe(false);
    });

    it('does not return the total comments', () => {
      const resWithTotalComments = createCaseSavedObjectResponse({
        overrides: {
          total_comments: 3,
        },
      });

      expect(
        // @ts-expect-error: total_comments is not defined in the attributes
        transformSavedObjectToExternalModel(resWithTotalComments).attributes.total_comments
      ).not.toBeDefined();
    });

    it('does not return the total alerts', () => {
      const resWithTotalAlerts = createCaseSavedObjectResponse({
        overrides: {
          total_alerts: 2,
        },
      });

      expect(
        // @ts-expect-error: total_alerts is not defined in the attributes
        transformSavedObjectToExternalModel(resWithTotalAlerts).attributes.total_alerts
      ).not.toBeDefined();
    });
  });

  describe('transformESModelToCase', () => {
    const createMockSearchHit = (
      references?: SavedObjectReference[],
      seqNo?: number,
      primaryTerm?: number
    ): estypes.SearchHit<{ references?: SavedObjectReference[] }> => ({
      _index: 'cases',
      _id: 'case-1',
      _score: 1.0,
      _seq_no: seqNo ?? 5,
      _primary_term: primaryTerm ?? 1,
      _source: {
        references,
      },
    });

    it('transforms basic case data correctly', () => {
      const caseData: CasePersistedAttributes = {
        ...basicESCaseFields,
        total_alerts: 5,
        total_comments: 3,
        total_events: 2,
      };

      const hit = createMockSearchHit([], 5, 1);

      const result = transformESModelToCase('case-1', caseData, hit);

      expect(result.id).toBe('case-1');
      expect(result.version).toBe(Buffer.from(JSON.stringify([5, 1]), 'utf8').toString('base64'));
      expect(result.totalComment).toBe(3);
      expect(result.totalAlerts).toBe(5);
      expect(result.totalEvents).toBe(2);
      expect(result.severity).toBe(CaseSeverity.LOW);
      expect(result.status).toBe(CaseStatuses.open);
    });

    it('transforms connector with reference correctly', () => {
      const connector = createESJiraConnector();
      const caseData: CasePersistedAttributes = {
        ...basicESCaseFields,
        connector: {
          name: connector.name,
          type: connector.type,
          fields: connector.fields,
        },
      };

      const hit = createMockSearchHit([
        { id: connector.id, name: CONNECTOR_ID_REFERENCE_NAME, type: ACTION_SAVED_OBJECT_TYPE },
      ]);

      const result = transformESModelToCase('case-1', caseData, hit);

      expect(result.connector).toMatchInlineSnapshot(`
        Object {
          "fields": Object {
            "issueType": "bug",
            "parent": "2",
            "priority": "high",
          },
          "id": "1",
          "name": ".jira",
          "type": ".jira",
        }
      `);
    });

    it('transforms connector to none when reference is not found', () => {
      const caseData: CasePersistedAttributes = {
        ...basicESCaseFields,
        connector: {
          name: ConnectorTypes.jira,
          type: ConnectorTypes.jira,
          fields: [{ key: 'issueType', value: 'bug' }],
        },
      };

      const hit = createMockSearchHit([]);
      const result = transformESModelToCase('case-1', caseData, hit);
      expect(result.connector).toMatchInlineSnapshot(`
        Object {
          "fields": null,
          "id": "none",
          "name": "none",
          "type": ".none",
        }
      `);
    });

    it('transforms external service with reference correctly', () => {
      const externalService = createExternalService({ connector_id: '100' });
      const { connector_id: pushConnectorId, ...restExternalService } = externalService;
      const caseData: CasePersistedAttributes = {
        ...basicESCaseFields,
        external_service: restExternalService,
      };

      const hit = createMockSearchHit([
        {
          id: pushConnectorId,
          name: PUSH_CONNECTOR_ID_REFERENCE_NAME,
          type: ACTION_SAVED_OBJECT_TYPE,
        },
      ]);

      const result = transformESModelToCase('case-1', caseData, hit);

      expect(result.external_service).toMatchInlineSnapshot(`
        Object {
          "connector_id": "100",
          "connector_name": ".jira",
          "external_id": "100",
          "external_title": "awesome",
          "external_url": "http://www.google.com",
          "pushed_at": "2019-11-25T21:54:48.952Z",
          "pushed_by": Object {
            "email": "testemail@elastic.co",
            "full_name": "elastic",
            "username": "elastic",
          },
        }
      `);
    });

    it('transforms external service to none when reference is not found', () => {
      const externalService = createExternalService();
      const { connector_id: pushConnectorId, ...restExternalService } = externalService;
      const caseData: CasePersistedAttributes = {
        ...basicESCaseFields,
        external_service: restExternalService,
      };

      const hit = createMockSearchHit([]);
      const result = transformESModelToCase('case-1', caseData, hit);
      expect(result.external_service?.connector_id).toBe('none');
    });

    it('preserves all other case attributes', () => {
      const caseData: CasePersistedAttributes = {
        ...basicESCaseFields,
        title: 'Test Title',
        description: 'Test Description',
        tags: ['tag1', 'tag2'],
        owner: 'securitySolution',
        assignees: [{ uid: 'user1' }],
        created_at: '2020-01-01T00:00:00.000Z',
        updated_at: '2020-01-02T00:00:00.000Z',
      };

      const hit = createMockSearchHit([]);

      const result = transformESModelToCase('case-1', caseData, hit);

      expect(result.title).toBe('Test Title');
      expect(result.description).toBe('Test Description');
      expect(result.tags).toEqual(['tag1', 'tag2']);
      expect(result.owner).toBe('securitySolution');
      expect(result.assignees).toEqual([{ uid: 'user1' }]);
      expect(result.created_at).toBe('2020-01-01T00:00:00.000Z');
      expect(result.updated_at).toBe('2020-01-02T00:00:00.000Z');
    });

    it('returns "0" as version when _seq_no and _primary_term are missing', () => {
      const caseData: CasePersistedAttributes = {
        ...basicESCaseFields,
      };

      const hit: estypes.SearchHit<{ references?: SavedObjectReference[] }> = {
        _index: 'cases',
        _id: 'case-1',
        _score: 1.0,
        _source: {
          references: [],
        },
      };

      const result = transformESModelToCase('case-1', caseData, hit);

      expect(result.version).toBe('0');
    });
  });
});

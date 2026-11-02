/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConnectorMappingResponseSchema,
  FindActionConnectorResponseSchema,
  GetCaseConnectorsResponseSchema,
} from './v1';

describe('FindActionConnectorResponseSchema', () => {
  const response = [
    {
      id: 'test',
      actionTypeId: '.test',
      name: 'My connector',
      isDeprecated: false,
      isPreconfigured: false,
      referencedByCount: 0,
      config: { foo: 'bar' },
      isMissingSecrets: false,
      isSystemAction: false,
      isConnectorTypeDeprecated: false,
    },
    {
      id: 'test-2',
      actionTypeId: '.test',
      name: 'My connector 2',
      isDeprecated: false,
      isPreconfigured: false,
      isSystemAction: false,
      referencedByCount: 0,
      isConnectorTypeDeprecated: false,
    },
  ];

  it('has expected attributes in request', () => {
    const result = FindActionConnectorResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(response);
  });

  it('strips unknown fields', () => {
    const result = FindActionConnectorResponseSchema.safeParse([{ ...response[0], foo: 'bar' }]);
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual([response[0]]);
  });
});

describe('GetCaseConnectorsResponseSchema', () => {
  const externalService = {
    connector_id: 'servicenow-1',
    connector_name: 'My SN connector',
    external_id: 'external_id',
    external_title: 'external title',
    external_url: 'basicPush.com',
    pushed_at: '2023-01-17T09:46:29.813Z',
    pushed_by: {
      full_name: 'Leslie Knope',
      username: 'lknope',
      email: 'leslie.knope@elastic.co',
    },
  };
  const defaultReq = {
    'servicenow-1': {
      id: 'servicenow-1',
      name: 'My SN connector',
      type: '.servicenow',
      fields: null,
      push: {
        needsToBePushed: false,
        hasBeenPushed: true,
        details: {
          oldestUserActionPushDate: '2023-01-17T09:46:29.813Z',
          latestUserActionPushDate: '2023-01-17T09:46:29.813Z',
          externalService,
        },
      },
    },
  };

  it('has expected attributes in request', () => {
    const result = GetCaseConnectorsResponseSchema.safeParse(defaultReq);
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(defaultReq);
  });

  it('strips unknown fields', () => {
    const result = GetCaseConnectorsResponseSchema.safeParse({
      'servicenow-1': { ...defaultReq['servicenow-1'], foo: 'bar' },
    });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(defaultReq);
  });
});

describe('ConnectorMappingResponseSchema', () => {
  const mappings = [
    {
      action_type: 'overwrite',
      source: 'title',
      target: 'unknown',
    },
    {
      action_type: 'append',
      source: 'description',
      target: 'not_mapped',
    },
  ];

  describe('ConnectorMappingResponseSchema', () => {
    it('has expected attributes in response', () => {
      const result = ConnectorMappingResponseSchema.safeParse({
        id: 'test',
        version: 'test',
        mappings,
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual({ id: 'test', version: 'test', mappings });
    });

    it('strips unknown fields', () => {
      const result = ConnectorMappingResponseSchema.safeParse({
        id: 'test',
        version: 'test',
        mappings,
        foo: 'bar',
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual({ id: 'test', version: 'test', mappings });
    });
  });
});

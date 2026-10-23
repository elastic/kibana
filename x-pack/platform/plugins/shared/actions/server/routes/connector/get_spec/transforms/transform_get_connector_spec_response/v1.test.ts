/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetConnectorSpecResult } from '../../../../../application/connector/methods/get_connector_spec/types';
import { getConnectorSpecResponseBodySchemaV1 } from '../../../../../../common/routes/connector/response';
import { transformGetConnectorSpecResponse } from './v1';

const formSchema = {
  type: 'object',
  properties: {
    config: { type: 'object', properties: {} },
    secrets: { type: 'object', properties: {} },
  },
};

const inputSchema = { type: 'object', properties: { id: { type: 'string' } } };

const result: GetConnectorSpecResult = {
  metadata: {
    id: 'test-connector',
    displayName: 'Test Connector',
    description: 'A test connector',
    icon: 'testIcon',
    docsUrl: 'https://example.com/docs',
    minimumLicense: 'gold',
    isTechnicalPreview: true,
    supportedFeatureIds: ['alerting'],
  },
  schema: formSchema,
  isTestable: true,
  authTypeIds: ['basic'],
  hasInboundEvents: false,
  isInboundOnly: false,
  isEarsExperimental: false,
  actions: [
    {
      name: 'listIncidents',
      description: 'List incidents',
      isTool: true,
      scope: 'read',
      inputSchema,
    },
  ],
};

describe('transformGetConnectorSpecResponse', () => {
  it('maps metadata and detail fields to the wire shape', () => {
    const body = transformGetConnectorSpecResponse(result);

    expect(body.metadata).toEqual({
      id: 'test-connector',
      display_name: 'Test Connector',
      description: 'A test connector',
      minimum_license: 'gold',
      supported_feature_ids: ['alerting'],
      icon: 'testIcon',
      docs_url: 'https://example.com/docs',
      is_technical_preview: true,
    });
    expect(body.schema).toBe(formSchema);
    expect(body.is_testable).toBe(true);
    expect(body.auth_type_ids).toEqual(['basic']);
    expect(body.has_inbound_events).toBe(false);
    expect(body.is_inbound_only).toBe(false);
    expect(body.is_ears_experimental).toBe(false);
    expect(body).not.toHaveProperty('availability');
    expect(body.actions).toEqual([
      {
        name: 'listIncidents',
        description: 'List incidents',
        is_tool: true,
        scope: 'read',
        input_schema: inputSchema,
      },
    ]);
  });

  it('omits optional metadata keys when they are undefined', () => {
    const { icon, docsUrl, isTechnicalPreview, ...metadata } = result.metadata;
    const body = transformGetConnectorSpecResponse({ ...result, metadata });

    expect(body.metadata).not.toHaveProperty('icon');
    expect(body.metadata).not.toHaveProperty('docs_url');
    expect(body.metadata).not.toHaveProperty('is_technical_preview');
  });

  it('keeps long bundled skill text off the wire and still validates', () => {
    const longSkill = 'Use listIncidents to search incident records. '.repeat(40);
    expect(longSkill.length).toBeGreaterThan(1024);

    const resultWithSkill: GetConnectorSpecResult = { ...result, skill: longSkill };
    const body = transformGetConnectorSpecResponse(resultWithSkill);

    expect(resultWithSkill.skill).toBe(longSkill);
    expect(JSON.stringify(body)).not.toContain(longSkill);
    expect(body).not.toHaveProperty('skill');
    expect(() => getConnectorSpecResponseBodySchemaV1.validate(body)).not.toThrow();
    expect(() =>
      getConnectorSpecResponseBodySchemaV1.validate({ ...body, skill: longSkill })
    ).toThrow();
  });

  it('passes input_schema through unchanged', () => {
    const body = transformGetConnectorSpecResponse(result);
    expect(body.actions[0].input_schema).toBe(inputSchema);
  });

  it('validates against getConnectorSpecResponseBodySchemaV1', () => {
    expect(() =>
      getConnectorSpecResponseBodySchemaV1.validate(transformGetConnectorSpecResponse(result))
    ).not.toThrow();
  });
});

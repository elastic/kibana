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
  it('returns only the pre-PR wire fields', () => {
    expect(transformGetConnectorSpecResponse(result)).toEqual({
      metadata: {
        id: 'test-connector',
        display_name: 'Test Connector',
        description: 'A test connector',
        minimum_license: 'gold',
        supported_feature_ids: ['alerting'],
        icon: 'testIcon',
        docs_url: 'https://example.com/docs',
        is_technical_preview: true,
      },
      schema: formSchema,
      is_testable: true,
      actions: [
        {
          name: 'listIncidents',
          description: 'List incidents',
          is_tool: true,
          scope: 'read',
        },
      ],
    });
  });

  it('omits optional metadata keys and action fields when undefined', () => {
    const { icon, docsUrl, isTechnicalPreview, ...metadata } = result.metadata;
    const pingAction: GetConnectorSpecResult['actions'][number] = {
      name: 'ping',
      isTool: false,
      scope: 'write',
      inputSchema,
    };
    const body = transformGetConnectorSpecResponse({ ...result, metadata, actions: [pingAction] });

    expect(body.metadata).not.toHaveProperty('icon');
    expect(body.metadata).not.toHaveProperty('docs_url');
    expect(body.metadata).not.toHaveProperty('is_technical_preview');
    expect(body.actions[0]).toEqual({ name: 'ping', is_tool: false, scope: 'write' });
  });

  it('keeps rich server fields and bundled skill off the wire', () => {
    const longSkill = 'Use listIncidents to search incident records. '.repeat(40);
    const withSkill: GetConnectorSpecResult = { ...result, skill: longSkill };
    const body = transformGetConnectorSpecResponse(withSkill);

    expect(JSON.stringify(body)).not.toContain(longSkill);
    expect(body).not.toHaveProperty('skill');
    expect(body).not.toHaveProperty('auth_type_ids');
    expect(body).not.toHaveProperty('has_inbound_events');
    expect(body).not.toHaveProperty('availability');
    expect(body.actions[0]).not.toHaveProperty('input_schema');
  });

  it('validates against the live getConnectorSpecResponseBodySchemaV1', () => {
    expect(() =>
      getConnectorSpecResponseBodySchemaV1.validate(transformGetConnectorSpecResponse(result))
    ).not.toThrow();
  });
});

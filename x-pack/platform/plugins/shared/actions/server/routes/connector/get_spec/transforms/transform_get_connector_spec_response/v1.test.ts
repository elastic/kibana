/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServerConnectorSpecDetail } from '../../../../../specs_client/types';
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

const detail: ServerConnectorSpecDetail = {
  id: 'test-connector',
  displayName: 'Test Connector',
  description: 'A test connector',
  icon: 'testIcon',
  docsUrl: 'https://example.com/docs',
  minimumLicense: 'gold',
  isTechnicalPreview: true,
  supportedFeatureIds: ['alerting'],
  availability: {
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    isDeprecated: false,
  },
  authTypeIds: ['basic'],
  isTestable: true,
  hasInboundEvents: false,
  isInboundOnly: false,
  isEarsExperimental: false,
  formSchema,
  skill: 'test-skill',
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
  it('keeps legacy keys and adds new detail fields', () => {
    const body = transformGetConnectorSpecResponse(detail);

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
    expect(body.availability).toEqual({
      enabled: true,
      enabled_in_config: true,
      enabled_in_license: true,
      is_deprecated: false,
    });
    expect(body.has_inbound_events).toBe(false);
    expect(body.is_inbound_only).toBe(false);
    expect(body.is_ears_experimental).toBe(false);
    expect(body).not.toHaveProperty('skill');
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

  it('omits icon and docs_url when undefined', () => {
    const { icon, docsUrl, ...rest } = detail;
    const body = transformGetConnectorSpecResponse(rest);

    expect(body.metadata).not.toHaveProperty('icon');
    expect(body.metadata).not.toHaveProperty('docs_url');
    expect(body.metadata.is_technical_preview).toBe(true);
  });

  it('keeps long bundled skill text off the wire and still validates', () => {
    const longSkill = 'Use listIncidents to search incident records. '.repeat(40);
    expect(longSkill.length).toBeGreaterThan(1024);

    const serverDetail: ServerConnectorSpecDetail = { ...detail, skill: longSkill };
    const body = transformGetConnectorSpecResponse(serverDetail);

    expect(serverDetail.skill).toBe(longSkill);
    expect(body).not.toHaveProperty('skill');
    expect(JSON.stringify(body)).not.toContain(longSkill);
    expect(() => getConnectorSpecResponseBodySchemaV1.validate(body)).not.toThrow();
  });

  it('passes input_schema through unchanged', () => {
    const body = transformGetConnectorSpecResponse(detail);
    expect(body.actions[0].input_schema).toBe(inputSchema);
  });

  it('validates against getConnectorSpecResponseBodySchemaV1', () => {
    expect(() =>
      getConnectorSpecResponseBodySchemaV1.validate(transformGetConnectorSpecResponse(detail))
    ).not.toThrow();
  });
});

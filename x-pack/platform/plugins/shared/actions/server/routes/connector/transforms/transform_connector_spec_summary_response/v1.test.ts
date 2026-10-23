/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpecSummary } from '../../../../../common/connector_spec';
import { getConnectorSpecResponseBodySchemaV1 } from '../../../../../common/routes/connector/response';
import { transformConnectorSpecSummaryResponse } from './v1';

const summary: ConnectorSpecSummary = {
  id: 'test-connector',
  displayName: 'Test Connector',
  description: 'A test connector',
  icon: 'testIcon',
  docsUrl: 'https://example.com/docs',
  minimumLicense: 'gold',
  isTechnicalPreview: true,
  supportedFeatureIds: ['alerting', 'workflows'],
  availability: {
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: false,
    isDeprecated: false,
  },
  authTypeIds: ['basic', 'api_key_header'],
  isTestable: true,
  hasInboundEvents: false,
  isInboundOnly: false,
  isEarsExperimental: false,
  actions: [
    {
      name: 'listIncidents',
      description: 'List incidents',
      isTool: true,
      scope: 'read',
    },
  ],
};

describe('transformConnectorSpecSummaryResponse', () => {
  it('maps camelCase summary fields to snake_case', () => {
    expect(transformConnectorSpecSummaryResponse(summary)).toEqual({
      id: 'test-connector',
      display_name: 'Test Connector',
      description: 'A test connector',
      icon: 'testIcon',
      docs_url: 'https://example.com/docs',
      minimum_license: 'gold',
      is_technical_preview: true,
      supported_feature_ids: ['alerting', 'workflows'],
      availability: {
        enabled: true,
        enabled_in_config: true,
        enabled_in_license: false,
        is_deprecated: false,
      },
      auth_type_ids: ['basic', 'api_key_header'],
      is_testable: true,
      has_inbound_events: false,
      is_inbound_only: false,
      is_ears_experimental: false,
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

  it('omits icon and docs_url when undefined and omits action description when undefined', () => {
    const { icon, docsUrl, ...rest } = summary;
    const result = transformConnectorSpecSummaryResponse({
      ...rest,
      actions: [{ name: 'ping', isTool: false, scope: 'write' }],
    });

    expect(result).not.toHaveProperty('icon');
    expect(result).not.toHaveProperty('docs_url');
    expect(result.actions[0]).toEqual({ name: 'ping', is_tool: false, scope: 'write' });
    expect(result.actions[0]).not.toHaveProperty('description');
  });

  it('produces fields that validate as a subset of the detail response schema', () => {
    const wire = transformConnectorSpecSummaryResponse(summary);
    const detailBody = {
      metadata: {
        id: wire.id,
        display_name: wire.display_name,
        description: wire.description,
        minimum_license: wire.minimum_license,
        supported_feature_ids: wire.supported_feature_ids,
        icon: wire.icon,
        docs_url: wire.docs_url,
        is_technical_preview: wire.is_technical_preview,
      },
      schema: {},
      is_testable: wire.is_testable,
      auth_type_ids: wire.auth_type_ids,
      has_inbound_events: wire.has_inbound_events,
      is_inbound_only: wire.is_inbound_only,
      is_ears_experimental: wire.is_ears_experimental,
      actions: wire.actions.map((action) => ({
        ...action,
        input_schema: {},
      })),
    };

    expect(() => getConnectorSpecResponseBodySchemaV1.validate(detailBody)).not.toThrow();
  });
});

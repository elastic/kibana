/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpecSummary } from '../../../../common/connector_spec';
import { formatConnectorSpecSummary } from './format_connector_spec_summary';

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

describe('formatConnectorSpecSummary', () => {
  it('maps camelCase summary fields to snake_case', () => {
    expect(formatConnectorSpecSummary(summary)).toEqual({
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
    const result = formatConnectorSpecSummary({
      ...rest,
      actions: [{ name: 'ping', isTool: false, scope: 'write' }],
    });

    expect(result).not.toHaveProperty('icon');
    expect(result).not.toHaveProperty('docs_url');
    expect(result.actions[0]).toEqual({ name: 'ping', is_tool: false, scope: 'write' });
    expect(result.actions[0]).not.toHaveProperty('description');
  });
});

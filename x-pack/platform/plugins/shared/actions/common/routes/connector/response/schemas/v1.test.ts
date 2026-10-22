/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAllConnectorTypesResponseSchemaV1 } from '..';

const stackRow = {
  id: '.server-log',
  name: 'Server log',
  enabled: true,
  enabled_in_config: true,
  enabled_in_license: true,
  minimum_license_required: 'basic',
  supported_feature_ids: ['alerting'],
  is_system_action_type: false,
  source: 'stack',
  is_deprecated: false,
  is_testable: false,
};

const specRow = {
  id: '.spec-stub',
  name: 'Spec Stub',
  enabled: true,
  enabled_in_config: true,
  enabled_in_license: true,
  minimum_license_required: 'gold',
  supported_feature_ids: ['workflows'],
  is_system_action_type: false,
  source: 'spec',
  is_deprecated: false,
  description: 'Spec stub',
  is_testable: true,
  icon: 'logo',
  docs_url: 'https://example.test',
  auth_type_ids: ['api_key_header'],
  has_inbound_events: false,
  is_inbound_only: false,
  is_ears_experimental: false,
  actions: [
    {
      name: 'listThings',
      description: 'List things',
      is_tool: true,
      scope: 'read',
    },
  ],
};

describe('getAllConnectorTypesResponseSchemaV1', () => {
  it('accepts stack rows without spec fields (old clients)', () => {
    expect(() => getAllConnectorTypesResponseSchemaV1.validate([stackRow])).not.toThrow();
  });

  it('accepts spec rows with spec fields', () => {
    expect(() => getAllConnectorTypesResponseSchemaV1.validate([specRow])).not.toThrow();
  });

  it('accepts spec rows without spec fields when the spec is missing', () => {
    expect(() =>
      getAllConnectorTypesResponseSchemaV1.validate([{ ...stackRow, source: 'spec' }])
    ).not.toThrow();
  });

  it('rejects spec action summaries with the wrong type', () => {
    expect(() =>
      getAllConnectorTypesResponseSchemaV1.validate([
        { ...specRow, actions: [{ name: 'listThings', is_tool: 'yes', scope: 'read' }] },
      ])
    ).toThrow();
  });

  it('rejects spec fields with the wrong type', () => {
    expect(() =>
      getAllConnectorTypesResponseSchemaV1.validate([{ ...specRow, auth_type_ids: 'basic' }])
    ).toThrow();
  });
});

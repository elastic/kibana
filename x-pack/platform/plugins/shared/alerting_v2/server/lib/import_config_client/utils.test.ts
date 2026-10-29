/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildCreateImportConfigAttributes,
  toImportSource,
  transformImportConfigSoAttributesToApiResponse,
} from './utils';

describe('toImportSource', () => {
  it.each([
    ['Datadog Monitors', 'datadog-monitors'],
    ['  PagerDuty -- prod!  ', 'pagerduty-prod'],
    ['!!!', 'import'],
    ['Elastic thing', 'custom-elastic-thing'],
  ])('turns %p into %p', (name, expected) => {
    expect(toImportSource(name)).toBe(expected);
  });

  it('keeps the slug within the id length limit', () => {
    expect(toImportSource('a'.repeat(400))).toHaveLength(100);
  });
});

describe('transformImportConfigSoAttributesToApiResponse', () => {
  it('leaves out optional attributes that are not set', () => {
    const response = transformImportConfigSoAttributesToApiResponse({
      id: 'import-1',
      attributes: {
        name: 'Datadog',
        kind: 'custom',
        enabled: true,
        source: 'datadog',
        connector_id: 'connector-1',
        workflow_id: 'workflow-1',
        tags: [],
        routing_tags: [],
        created_by: null,
        updated_by: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    });

    expect(response).not.toHaveProperty('description');
    expect(response).not.toHaveProperty('fingerprint_field');
    expect(response).toMatchObject({ id: 'import-1', source: 'datadog', kind: 'custom' });
  });
});

describe('buildCreateImportConfigAttributes', () => {
  const baseParams = {
    data: { name: 'Datadog (prod)' },
    id: 'connector-1',
    source: 'datadog',
    connectorId: 'connector-1',
    workflowId: 'workflow-1',
  };

  it('defaults to a custom import', () => {
    const attributes = buildCreateImportConfigAttributes({
      params: baseParams,
      actor: null,
      now: '2025-01-01T00:00:00Z',
    });

    expect(attributes.kind).toBe('custom');
    expect(attributes).not.toHaveProperty('connector_type_id');
  });

  it('stores the kind and the connector type of a managed import', () => {
    const attributes = buildCreateImportConfigAttributes({
      params: { ...baseParams, kind: 'managed', connectorTypeId: '.datadog' },
      actor: null,
      now: '2025-01-01T00:00:00Z',
    });

    expect(attributes).toMatchObject({ kind: 'managed', connector_type_id: '.datadog' });
    expect(
      transformImportConfigSoAttributesToApiResponse({ id: 'connector-1', attributes })
    ).toMatchObject({ kind: 'managed', connector_type_id: '.datadog' });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterMetadataToTemplateFields } from './filter_template_metadata';

const INCIDENT_FIELDS = [
  'status',
  'severity',
  'assignees',
  'verdict',
  'summary',
  'description',
  'close_reason',
  'linked_investigations',
];

describe('filterMetadataToTemplateFields', () => {
  it('drops keys not declared by the target template', () => {
    const result = filterMetadataToTemplateFields({
      metadata: {
        // Present on investigation template, absent on incident — the exact 400 this filter prevents.
        workflow_execution_id: 'wf-123',
        severity: 'high',
        summary: 'Suspicious activity',
      },
      declaredFields: INCIDENT_FIELDS,
    });

    expect(result).not.toHaveProperty('workflow_execution_id');
    expect(result).toHaveProperty('severity', 'high');
    expect(result).toHaveProperty('summary', 'Suspicious activity');
  });

  it('drops keys listed in `exclude` even when declared', () => {
    const result = filterMetadataToTemplateFields({
      metadata: {
        linked_investigations: ['inv-1'],
        severity: 'low',
      },
      declaredFields: INCIDENT_FIELDS,
      exclude: ['linked_investigations'],
    });

    expect(result).not.toHaveProperty('linked_investigations');
    expect(result).toHaveProperty('severity', 'low');
  });

  it('drops empty string values', () => {
    const result = filterMetadataToTemplateFields({
      metadata: { severity: '', summary: 'A summary' },
      declaredFields: INCIDENT_FIELDS,
    });

    expect(result).not.toHaveProperty('severity');
    expect(result).toHaveProperty('summary');
  });

  it('drops empty array values', () => {
    const result = filterMetadataToTemplateFields({
      metadata: { assignees: [], summary: 'A summary' },
      declaredFields: INCIDENT_FIELDS,
    });

    expect(result).not.toHaveProperty('assignees');
    expect(result).toHaveProperty('summary');
  });

  it('returns an empty object when metadata is undefined', () => {
    const result = filterMetadataToTemplateFields({
      metadata: undefined,
      declaredFields: INCIDENT_FIELDS,
    });

    expect(result).toEqual({});
  });

  it('returns an empty object when metadata is empty', () => {
    const result = filterMetadataToTemplateFields({
      metadata: {},
      declaredFields: INCIDENT_FIELDS,
    });

    expect(result).toEqual({});
  });

  it('preserves non-empty arrays', () => {
    const result = filterMetadataToTemplateFields({
      metadata: { assignees: ['user-1', 'user-2'] },
      declaredFields: INCIDENT_FIELDS,
    });

    expect(result).toHaveProperty('assignees', ['user-1', 'user-2']);
  });

  it('copies all seven overlapping fields from an investigation', () => {
    const investigationMetadata = {
      status: 'open',
      severity: 'high',
      assignees: ['user-1'],
      verdict: 'Confirmed threat',
      summary: 'An attacker exploited...',
      description: 'Alert fired on suspicious PowerShell',
      close_reason: 'resolved',
      workflow_execution_id: 'wf-abc', // investigation-only: must be excluded
    };

    const result = filterMetadataToTemplateFields({
      metadata: investigationMetadata,
      declaredFields: INCIDENT_FIELDS,
      exclude: ['linked_investigations'],
    });

    expect(Object.keys(result).sort()).toEqual(
      [
        'status',
        'severity',
        'assignees',
        'verdict',
        'summary',
        'description',
        'close_reason',
      ].sort()
    );
    expect(result).not.toHaveProperty('workflow_execution_id');
  });
});

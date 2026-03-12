/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CAI_CONTENT_INDEX_MAPPINGS } from './mappings';

describe('CAI_CONTENT_INDEX_MAPPINGS', () => {
  it('has dynamic: false at root (strict is handled by dynamic_templates)', () => {
    expect(CAI_CONTENT_INDEX_MAPPINGS.dynamic).toBe(false);
  });

  it('has doc_type discriminator field', () => {
    expect(CAI_CONTENT_INDEX_MAPPINGS.properties?.doc_type).toEqual({ type: 'keyword' });
  });

  it('has extended_fields as dynamic object', () => {
    expect(CAI_CONTENT_INDEX_MAPPINGS.properties?.extended_fields).toEqual({
      type: 'object',
      dynamic: true,
    });
  });

  it('has dynamic_templates for all supported type suffixes', () => {
    const templates = CAI_CONTENT_INDEX_MAPPINGS.dynamic_templates;
    expect(templates).toBeDefined();

    const templateNames = templates!.map((t: Record<string, unknown>) => Object.keys(t)[0]);
    expect(templateNames).toContain('ef_keyword');
    expect(templateNames).toContain('ef_text');
    expect(templateNames).toContain('ef_long');
    expect(templateNames).toContain('ef_double');
    expect(templateNames).toContain('ef_date');
    expect(templateNames).toContain('ef_boolean');
    expect(templateNames).toContain('ef_ip');
    expect(templateNames).toContain('ef_date_range');
  });

  it('maps *_as_long to long type', () => {
    const longTemplate = CAI_CONTENT_INDEX_MAPPINGS.dynamic_templates!.find(
      (t: Record<string, unknown>) => Object.keys(t)[0] === 'ef_long'
    );
    const config = Object.values(longTemplate!)[0] as { path_match: string; mapping: { type: string } };
    expect(config.path_match).toBe('extended_fields.*_as_long');
    expect(config.mapping.type).toBe('long');
  });

  it('maps *_as_ip to ip type', () => {
    const ipTemplate = CAI_CONTENT_INDEX_MAPPINGS.dynamic_templates!.find(
      (t: Record<string, unknown>) => Object.keys(t)[0] === 'ef_ip'
    );
    const config = Object.values(ipTemplate!)[0] as { path_match: string; mapping: { type: string } };
    expect(config.path_match).toBe('extended_fields.*_as_ip');
    expect(config.mapping.type).toBe('ip');
  });

  it('all dynamic_templates use correct path_match pattern (extended_fields.*_as_<type>)', () => {
    const templates = CAI_CONTENT_INDEX_MAPPINGS.dynamic_templates!;
    const expectedPatterns: Record<string, string> = {
      ef_keyword: 'extended_fields.*_as_keyword',
      ef_text: 'extended_fields.*_as_text',
      ef_long: 'extended_fields.*_as_long',
      ef_double: 'extended_fields.*_as_double',
      ef_date: 'extended_fields.*_as_date',
      ef_boolean: 'extended_fields.*_as_boolean',
      ef_ip: 'extended_fields.*_as_ip',
      ef_date_range: 'extended_fields.*_as_date_range',
    };

    for (const [name, expectedPath] of Object.entries(expectedPatterns)) {
      const template = templates.find((t: Record<string, unknown>) => Object.keys(t)[0] === name);
      expect(template).toBeDefined();
      const config = Object.values(template!)[0] as { path_match: string; mapping: { type: string } };
      expect(config.path_match).toBe(expectedPath);
    }
  });

  it('includes case-specific fields', () => {
    const props = CAI_CONTENT_INDEX_MAPPINGS.properties!;
    expect(props.title).toBeDefined();
    expect(props.status).toBeDefined();
    expect(props.severity).toBeDefined();
    expect(props.tags).toBeDefined();
    expect(props.closed_at).toBeDefined();
    expect(props.assignees).toBeDefined();
    expect(props.custom_fields).toBeDefined();
    expect(props.observables).toBeDefined();
  });

  it('includes comment-specific fields', () => {
    const props = CAI_CONTENT_INDEX_MAPPINGS.properties!;
    expect(props.comment).toBeDefined();
  });

  it('includes attachment-specific fields', () => {
    const props = CAI_CONTENT_INDEX_MAPPINGS.properties!;
    expect(props.type).toBeDefined();
    expect(props.payload).toBeDefined();
  });

  it('includes common fields shared by all doc_types', () => {
    const props = CAI_CONTENT_INDEX_MAPPINGS.properties!;
    expect(props.case_id).toBeDefined();
    expect(props.owner).toBeDefined();
    expect(props.space_ids).toBeDefined();
    expect(props.created_at).toBeDefined();
    expect(props.updated_at).toBeDefined();
    expect(props.created_by).toBeDefined();
  });
});

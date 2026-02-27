/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CAI_CONTENT_INDEX_MAPPINGS } from './mappings';

describe('content_index mappings', () => {
  it('has strict dynamic setting at root', () => {
    expect(CAI_CONTENT_INDEX_MAPPINGS.dynamic).toBe('strict');
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const templateNames = templates!.map((t: any) => Object.keys(t)[0]);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t: any) => Object.keys(t)[0] === 'ef_long'
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = Object.values(longTemplate!)[0] as any;
    expect(config.path_match).toBe('extended_fields.*_as_long');
    expect(config.mapping.type).toBe('long');
  });

  it('maps *_as_ip to ip type', () => {
    const ipTemplate = CAI_CONTENT_INDEX_MAPPINGS.dynamic_templates!.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t: any) => Object.keys(t)[0] === 'ef_ip'
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = Object.values(ipTemplate!)[0] as any;
    expect(config.path_match).toBe('extended_fields.*_as_ip');
    expect(config.mapping.type).toBe('ip');
  });

  it('includes case-specific fields', () => {
    const props = CAI_CONTENT_INDEX_MAPPINGS.properties!;
    expect(props.title).toBeDefined();
    expect(props.status).toBeDefined();
    expect(props.severity).toBeDefined();
    expect(props.tags).toBeDefined();
    expect(props.assignees).toBeDefined();
  });

  it('includes comment-specific fields', () => {
    const props = CAI_CONTENT_INDEX_MAPPINGS.properties!;
    expect(props.comment).toBeDefined();
    expect((props.comment as { type: string }).type).toBe('text');
  });

  it('includes attachment-specific fields', () => {
    const props = CAI_CONTENT_INDEX_MAPPINGS.properties!;
    expect(props.type).toBeDefined();
    expect(props.payload).toBeDefined();
  });

  it('includes common cross-doc fields', () => {
    const props = CAI_CONTENT_INDEX_MAPPINGS.properties!;
    expect(props.case_id).toBeDefined();
    expect(props.owner).toBeDefined();
    expect(props.space_ids).toBeDefined();
    expect(props.created_at).toBeDefined();
    expect(props.created_by).toBeDefined();
    expect(props.updated_at).toBeDefined();
  });
});

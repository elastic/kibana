/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collectFieldPaths, validateCustomFieldNames } from './pipeline_utils';

describe('validateCustomFieldNames', () => {
  const prefix = 'myint.myds.';

  it('accepts lowercase snake_case custom field names', () => {
    const errors = validateCustomFieldNames(
      ['myint.myds.src_port', 'myint.myds.cert.subject_cn', 'myint.myds.x509'],
      prefix
    );

    expect(errors).toEqual([]);
  });

  it('ignores fields outside the custom namespace', () => {
    const errors = validateCustomFieldNames(
      ['@timestamp', 'source.ip', 'event.original', 'vulnerability.cisaNotes'],
      prefix
    );

    expect(errors).toEqual([]);
  });

  it('flags camelCase names and suggests the snake_case name', () => {
    const errors = validateCustomFieldNames(['myint.myds.evaluatorImpact'], prefix);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("Field 'myint.myds.evaluatorImpact'");
    expect(errors[0]).toContain("'myint.myds.evaluator_impact'");
  });

  it('flags names with spaces and punctuation and suggests a cleaned name', () => {
    const errors = validateCustomFieldNames(
      ['myint.myds.The Temporary Blocked Sites list is full (capacity'],
      prefix
    );

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("'myint.myds.the_temporary_blocked_sites_list_is_full_capacity'");
  });

  it('flags an invalid nested segment and keeps the valid parents', () => {
    const errors = validateCustomFieldNames(['myint.myds.ike.peer.144:500'], prefix);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("'myint.myds.ike.peer.144_500'");
  });

  it('says when the suggested name already exists instead of suggesting it', () => {
    const errors = validateCustomFieldNames(['myint.myds.srcIP', 'myint.myds.src_ip'], prefix);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("'myint.myds.src_ip' already exists");
    expect(errors[0]).not.toContain("Rename it to 'myint.myds.src_ip'");
  });

  it('asks for a descriptive name when nothing usable is left after conversion', () => {
    const errors = validateCustomFieldNames(['myint.myds.***'], prefix);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('choose a descriptive snake_case name');
    expect(errors[0]).not.toContain("'myint.myds.field'");
  });

  it('reports each invalid field once', () => {
    const errors = validateCustomFieldNames(
      ['myint.myds.evaluatorImpact', 'myint.myds.evaluatorImpact', 'myint.myds.ok'],
      prefix
    );

    expect(errors).toHaveLength(1);
  });
});

describe('collectFieldPaths', () => {
  it('descends into arrays of objects so their children are validated', () => {
    const paths = collectFieldPaths({
      myint: { myds: { items: [{ evaluatorImpact: 'high' }, { otherKey: 1 }] } },
    });

    expect(paths).toEqual(['myint.myds.items.evaluatorImpact', 'myint.myds.items.otherKey']);
  });

  it('keeps arrays of primitives as a single leaf path', () => {
    const paths = collectFieldPaths({ related: { ip: ['10.0.0.1', '10.0.0.2'] }, tags: [] });

    expect(paths).toEqual(['related.ip', 'tags']);
  });

  it('returns nested object paths in dot notation', () => {
    const paths = collectFieldPaths({ source: { ip: '10.0.0.1', port: 443 }, '@timestamp': 'x' });

    expect(paths).toEqual(['source.ip', 'source.port', '@timestamp']);
  });
});

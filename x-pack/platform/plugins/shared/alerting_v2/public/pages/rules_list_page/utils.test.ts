/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRulesListFilter } from './utils';

describe('buildRulesListFilter', () => {
  it('returns undefined when no filters are selected', () => {
    expect(buildRulesListFilter({})).toBeUndefined();
  });

  it('builds a combined KQL filter for status and mode', () => {
    expect(buildRulesListFilter({ enabled: 'false', kind: 'signal' })).toBe(
      'enabled: false AND kind: signal'
    );
  });

  it('builds a KQL filter for a single tag', () => {
    expect(buildRulesListFilter({ tags: ['prod'] })).toBe('(metadata.tags: "prod")');
  });

  it('builds a KQL OR filter for multiple tags', () => {
    expect(buildRulesListFilter({ tags: ['prod', 'staging'] })).toBe(
      '(metadata.tags: "prod" OR metadata.tags: "staging")'
    );
  });

  it('negates a single excluded tag', () => {
    expect(buildRulesListFilter({ excludedTags: ['prod'] })).toBe('NOT (metadata.tags: "prod")');
  });

  it('negates the whole OR group when several tags are excluded', () => {
    expect(buildRulesListFilter({ excludedTags: ['prod', 'staging'] })).toBe(
      'NOT (metadata.tags: "prod" OR metadata.tags: "staging")'
    );
  });

  it('intersects included and excluded tags', () => {
    expect(buildRulesListFilter({ tags: ['prod'], excludedTags: ['staging'] })).toBe(
      '(metadata.tags: "prod") AND NOT (metadata.tags: "staging")'
    );
  });

  it('combines status, tags, and mode into a single KQL filter', () => {
    expect(buildRulesListFilter({ enabled: 'true', tags: ['prod'], kind: 'alert' })).toBe(
      'enabled: true AND (metadata.tags: "prod") AND kind: alert'
    );
  });

  it('combines status, included tags, excluded tags, and mode', () => {
    expect(
      buildRulesListFilter({
        enabled: 'true',
        tags: ['prod'],
        excludedTags: ['staging'],
        kind: 'alert',
      })
    ).toBe(
      'enabled: true AND (metadata.tags: "prod") AND NOT (metadata.tags: "staging") AND kind: alert'
    );
  });

  it('builds a KQL filter for the template a rule was created from', () => {
    expect(buildRulesListFilter({ templateIds: ['nginx-error-rate'] })).toBe(
      '(metadata.template.id: "nginx-error-rate")'
    );
  });

  it('builds a KQL OR filter for multiple templates', () => {
    expect(buildRulesListFilter({ templateIds: ['a-template', 'b-template'] })).toBe(
      '(metadata.template.id: "a-template" OR metadata.template.id: "b-template")'
    );
  });

  it('negates the whole OR group when several templates are excluded', () => {
    expect(buildRulesListFilter({ excludedTemplateIds: ['a-template', 'b-template'] })).toBe(
      'NOT (metadata.template.id: "a-template" OR metadata.template.id: "b-template")'
    );
  });

  it('intersects included and excluded templates', () => {
    expect(
      buildRulesListFilter({ templateIds: ['a-template'], excludedTemplateIds: ['b-template'] })
    ).toBe('(metadata.template.id: "a-template") AND NOT (metadata.template.id: "b-template")');
  });

  it('escapes double quotes and backslashes in template ids', () => {
    expect(buildRulesListFilter({ templateIds: ['a"b\\c'] })).toBe(
      '(metadata.template.id: "a\\"b\\\\c")'
    );
  });

  it('ignores empty template arrays', () => {
    expect(buildRulesListFilter({ templateIds: [], excludedTemplateIds: [] })).toBeUndefined();
  });

  it('combines the template with the other filters', () => {
    expect(
      buildRulesListFilter({
        enabled: 'true',
        tags: ['prod'],
        kind: 'alert',
        templateIds: ['nginx-error-rate'],
      })
    ).toBe(
      'enabled: true AND (metadata.tags: "prod") AND kind: alert AND (metadata.template.id: "nginx-error-rate")'
    );
  });

  it('ignores empty tag arrays', () => {
    expect(buildRulesListFilter({ tags: [], excludedTags: [] })).toBeUndefined();
  });

  it('escapes double quotes in tag values', () => {
    expect(buildRulesListFilter({ tags: ['my "special" tag'] })).toBe(
      '(metadata.tags: "my \\"special\\" tag")'
    );
  });

  it('escapes backslashes in tag values before escaping double quotes', () => {
    expect(buildRulesListFilter({ tags: ['test\\'] })).toBe('(metadata.tags: "test\\\\")');
  });

  it('escapes excluded tag values the same way as included ones', () => {
    expect(buildRulesListFilter({ excludedTags: ['my "special" tag'] })).toBe(
      'NOT (metadata.tags: "my \\"special\\" tag")'
    );
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWikiRegistry } from './wiki_registry';

const definition = {
  id: 'team-wiki',
  index: 'team-pages',
  pageTypes: { detection_rule: { entriesHeading: 'Decision history' } },
};

describe('createWikiRegistry', () => {
  it('resolves a registered page type to the wiki index', () => {
    const registry = createWikiRegistry();
    registry.register(definition);

    expect(registry.resolve('team-wiki', 'detection_rule')).toEqual({
      index: 'team-pages',
      pageType: { entriesHeading: 'Decision history' },
    });
  });

  it('refuses an unregistered wiki or page type', () => {
    const registry = createWikiRegistry();
    registry.register(definition);

    expect(() => registry.resolve('other', 'detection_rule')).toThrow(
      expect.objectContaining({ code: 'unknown_wiki' })
    );
    expect(() => registry.resolve('team-wiki', 'host')).toThrow(
      expect.objectContaining({ code: 'unknown_page_type' })
    );
    expect(() => registry.resolve('team-wiki', 'toString')).toThrow(
      expect.objectContaining({ code: 'unknown_page_type' })
    );
  });

  it('refuses a second wiki under the same id', () => {
    const registry = createWikiRegistry();
    registry.register(definition);

    expect(() => registry.register({ ...definition, index: 'elsewhere' })).toThrow(
      'already registered'
    );
  });

  it.each([
    ['an invalid id', { id: 'Team Wiki' }],
    ['an index pattern', { index: 'team-*' }],
    ['no page type', { pageTypes: {} }],
    ['an invalid page type', { pageTypes: { 'Detection-Rule': { entriesHeading: 'History' } } }],
    ['a multi-line heading', { pageTypes: { detection_rule: { entriesHeading: 'A\nB' } } }],
  ])('refuses a definition with %s', (_, override) => {
    expect(() => createWikiRegistry().register({ ...definition, ...override })).toThrow();
  });
});

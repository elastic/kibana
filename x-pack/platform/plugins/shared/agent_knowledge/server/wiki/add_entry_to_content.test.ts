/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addEntryToContent } from './add_entry_to_content';

describe('addEntryToContent', () => {
  it('starts an empty page with the entries heading', () => {
    expect(addEntryToContent('', 'Decision history', '### One\nFirst')).toBe(
      '## Decision history\n\n### One\nFirst\n'
    );
  });

  it('keeps the earlier page as a prefix when the entries section is last', () => {
    const first = addEntryToContent('', 'Decision history', '### One\nFirst');
    const second = addEntryToContent(first, 'Decision history', '### Two\nSecond');

    expect(second.startsWith(first)).toBe(true);
    expect(second).toBe('## Decision history\n\n### One\nFirst\n\n### Two\nSecond\n');
  });

  it('adds to the end of the entries section when another section follows it', () => {
    const content = '## Decision history\n\n### One\nFirst\n\n## Notes\nKeep me\n';

    expect(addEntryToContent(content, 'Decision history', '### Two')).toBe(
      '## Decision history\n\n### One\nFirst\n\n### Two\n\n## Notes\nKeep me\n'
    );
  });

  it('appends the section after existing content that lacks it', () => {
    expect(addEntryToContent('## Rule\nAbout the rule\n\n', 'Decision history', '### One')).toBe(
      '## Rule\nAbout the rule\n\n## Decision history\n\n### One\n'
    );
  });

  it('ignores a heading inside a fenced code block', () => {
    const content = '## Decision history\n\n### One\n```\n## Notes\n```\n';

    expect(addEntryToContent(content, 'Decision history', '### Two')).toBe(
      '## Decision history\n\n### One\n```\n## Notes\n```\n\n### Two\n'
    );
  });

  it('does not treat a deeper heading as a section boundary', () => {
    const content = '## Decision history\n\n### One\n#### Detail\n';

    expect(addEntryToContent(content, 'Decision history', '### Two')).toBe(
      '## Decision history\n\n### One\n#### Detail\n\n### Two\n'
    );
  });
});

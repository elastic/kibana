/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceToolIdsInToolSelection, replaceToolIdsInArray } from './tool_id_migration';

describe('replaceToolIdsInToolSelection', () => {
  it('replaces old id with new ids', () => {
    const tools = [{ tool_ids: ['other.tool', 'platform.core.cases.attachments'] }];
    const result = replaceToolIdsInToolSelection(tools, 'platform.core.cases.attachments', [
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
    expect(result).toEqual([
      {
        tool_ids: [
          'other.tool',
          'platform.core.cases.get_attachments',
          'platform.core.cases.manage_attachments',
        ],
      },
    ]);
  });

  it('returns unchanged array when old id is not present', () => {
    const tools = [{ tool_ids: ['other.tool'] }];
    const result = replaceToolIdsInToolSelection(tools, 'platform.core.cases.attachments', [
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
    expect(result).toEqual([{ tool_ids: ['other.tool'] }]);
  });

  it('does not duplicate if new ids already present', () => {
    const tools = [
      {
        tool_ids: ['platform.core.cases.attachments', 'platform.core.cases.get_attachments'],
      },
    ];
    const result = replaceToolIdsInToolSelection(tools, 'platform.core.cases.attachments', [
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
    expect(result).toEqual([
      {
        tool_ids: ['platform.core.cases.get_attachments', 'platform.core.cases.manage_attachments'],
      },
    ]);
  });

  it('handles multiple selections', () => {
    const tools = [{ tool_ids: ['platform.core.cases.attachments'] }, { tool_ids: ['other.tool'] }];
    const result = replaceToolIdsInToolSelection(tools, 'platform.core.cases.attachments', [
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
    expect(result).toEqual([
      {
        tool_ids: ['platform.core.cases.get_attachments', 'platform.core.cases.manage_attachments'],
      },
      { tool_ids: ['other.tool'] },
    ]);
  });
});

describe('replaceToolIdsInArray', () => {
  it('replaces old id with new ids', () => {
    const result = replaceToolIdsInArray(
      ['other.tool', 'platform.core.cases.attachments'],
      'platform.core.cases.attachments',
      ['platform.core.cases.get_attachments', 'platform.core.cases.manage_attachments']
    );
    expect(result).toEqual([
      'other.tool',
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
  });

  it('returns unchanged array when old id is not present', () => {
    const result = replaceToolIdsInArray(['other.tool'], 'platform.core.cases.attachments', [
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
    expect(result).toEqual(['other.tool']);
  });

  it('does not duplicate if new ids already present', () => {
    const result = replaceToolIdsInArray(
      ['platform.core.cases.attachments', 'platform.core.cases.get_attachments'],
      'platform.core.cases.attachments',
      ['platform.core.cases.get_attachments', 'platform.core.cases.manage_attachments']
    );
    expect(result).toEqual([
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
  });

  it('returns same reference when old id is absent', () => {
    const original = ['other.tool'];
    const result = replaceToolIdsInArray(original, 'platform.core.cases.attachments', [
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
    expect(result).toBe(original);
  });
});

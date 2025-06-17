/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractKeywordsFromRegex } from './extract_keywords';

describe('extractKeywordsFromRegex', () => {
  it('should extract keywords from a complex regex string', () => {
    const regex =
      '.*?command.+?adminConsole\\.users.+?command.+?update.+?update.+?id.+?ObjectId.+?updateObj.+?set.+?id.+?ObjectId.+?country.+?writeConcern.+?w.+?majority.+?wtimeout.+?lsid.+?id.+?UUID.+?numYields.+?reslen.+?locks.+?Global.+?acquireCount.+?r.+?w.+?Database.+?acquireCount.+?w.+?Collection.+?acquireCount.+?w.+?storage.+?data.+?bytesWritten.+?protocol.+?op_msg.*?';

    const result = extractKeywordsFromRegex(regex);

    expect(result).toEqual([
      'command',
      'adminConsole.users',
      'command',
      'update',
      'update',
      'id',
      'ObjectId',
      'updateObj',
      'set',
      'id',
      'ObjectId',
      'country',
      'writeConcern',
      'w',
      'majority',
      'wtimeout',
      'lsid',
      'id',
      'UUID',
      'numYields',
      'reslen',
      'locks',
      'Global',
      'acquireCount',
      'r',
      'w',
      'Database',
      'acquireCount',
      'w',
      'Collection',
      'acquireCount',
      'w',
      'storage',
      'data',
      'bytesWritten',
      'protocol',
      'op_msg',
    ]);
  });

  it('should return an empty array for an empty string', () => {
    expect(extractKeywordsFromRegex('')).toEqual([]);
  });

  it('should trim and filter empty keywords', () => {
    expect(extractKeywordsFromRegex('.*?foo.+?.+?bar.*?')).toEqual(['foo', 'bar']);
  });

  it('should remove backslashes', () => {
    expect(extractKeywordsFromRegex('.*?foo\\.bar.*?')).toEqual(['foo.bar']);
  });

  it('should handle no wildcards', () => {
    expect(extractKeywordsFromRegex('keyword')).toEqual(['keyword']);
  });

  it('should handle leading and trailing spaces', () => {
    expect(extractKeywordsFromRegex('.*?  foo  .+?  bar  .*?')).toEqual(['foo', 'bar']);
  });
});

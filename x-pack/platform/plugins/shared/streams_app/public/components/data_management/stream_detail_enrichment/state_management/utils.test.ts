/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import { collectDescendantStepIds, safeParseSessionStorageItem } from './utils';

const makeStep = (
  id: string,
  parentId: StreamlangStepWithUIAttributes['parentId'] = null
): StreamlangStepWithUIAttributes =>
  ({
    customIdentifier: id,
    parentId,
  } as StreamlangStepWithUIAttributes);

const steps: StreamlangStepWithUIAttributes[] = [
  makeStep('root'),
  makeStep('child1', 'root'),
  makeStep('child2', 'root'),
  makeStep('grandchild1', 'child1'),
  makeStep('grandchild2', 'child1'),
  makeStep('greatGrandchild', 'grandchild1'),
];

describe('collectDescendantStepIds', () => {
  it('returns all descendants for a given parent', () => {
    const ids = Array.from(collectDescendantStepIds(steps, 'root'));
    expect(ids).toEqual(['child1', 'grandchild1', 'greatGrandchild', 'grandchild2', 'child2']);
  });

  it('returns only subtree descendants', () => {
    const ids = Array.from(collectDescendantStepIds(steps, 'child1'));
    expect(ids).toEqual(['grandchild1', 'greatGrandchild', 'grandchild2']);
  });

  it('returns empty set when no descendants exist', () => {
    const ids = Array.from(collectDescendantStepIds(steps, 'leaf'));
    expect(ids).toEqual([]);
  });
});

describe('safeParseSessionStorageItem', () => {
  const testKey = 'test-key';

  beforeEach(() => {
    sessionStorage.clear();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns undefined when key does not exist', () => {
    const result = safeParseSessionStorageItem(testKey);
    expect(result).toBeUndefined();
  });

  it('returns parsed value for valid JSON', () => {
    const testData = { name: 'test', documents: ['doc1', 'doc2'] };
    sessionStorage.setItem(testKey, JSON.stringify(testData));

    const result = safeParseSessionStorageItem<typeof testData>(testKey);
    expect(result).toEqual(testData);
  });

  it('returns undefined and removes corrupted entry for invalid JSON', () => {
    sessionStorage.setItem(testKey, 'invalid json {{{');

    const result = safeParseSessionStorageItem(testKey);

    expect(result).toBeUndefined();
    expect(sessionStorage.getItem(testKey)).toBeNull();
    // eslint-disable-next-line no-console
    expect(console.warn).toHaveBeenCalledWith(`Removed corrupted sessionStorage entry: ${testKey}`);
  });

  it('returns undefined and removes entry for truncated JSON', () => {
    sessionStorage.setItem(testKey, '{"name": "test", "docs":');

    const result = safeParseSessionStorageItem(testKey);

    expect(result).toBeUndefined();
    expect(sessionStorage.getItem(testKey)).toBeNull();
    // eslint-disable-next-line no-console
    expect(console.warn).toHaveBeenCalled();
  });

  it('returns undefined for empty string value', () => {
    sessionStorage.setItem(testKey, '');

    const result = safeParseSessionStorageItem(testKey);
    // Empty string is falsy, so it returns undefined without trying to parse
    expect(result).toBeUndefined();
  });

  it('handles complex nested objects', () => {
    const complexData = {
      type: 'custom-samples',
      name: 'Test Source',
      enabled: true,
      documents: [{ id: 1, data: { nested: true } }],
      storageKey: 'streams:custom-samples__test__uuid',
    };
    sessionStorage.setItem(testKey, JSON.stringify(complexData));

    const result = safeParseSessionStorageItem<typeof complexData>(testKey);
    expect(result).toEqual(complexData);
  });
});

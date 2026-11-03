/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateObservableDocumentId } from './observable_id';

describe('generateObservableDocumentId', () => {
  const args = { spaceId: 'default', caseId: 'case-1', typeKey: 'type-1', value: '1.1.1.1' };

  it('returns a 36 character id so the existing observable id limits still hold', () => {
    expect(generateObservableDocumentId(args)).toHaveLength(36);
  });

  it('returns the same id for the same space, case, type and value', () => {
    expect(generateObservableDocumentId(args)).toBe(generateObservableDocumentId({ ...args }));
  });

  it.each([
    ['space', { spaceId: 'other' }],
    ['case', { caseId: 'case-2' }],
    ['type', { typeKey: 'type-2' }],
    ['value', { value: '2.2.2.2' }],
  ])('returns a different id when the %s differs', (_, override) => {
    expect(generateObservableDocumentId({ ...args, ...override })).not.toBe(
      generateObservableDocumentId(args)
    );
  });

  it('does not collide when a separator-like character moves between fields', () => {
    expect(generateObservableDocumentId({ ...args, caseId: 'a', typeKey: 'bc' })).not.toBe(
      generateObservableDocumentId({ ...args, caseId: 'ab', typeKey: 'c' })
    );
  });
});

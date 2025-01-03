/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from './is_populated_object';

describe('isPopulatedObject', () => {
  it('does not allow numbers', () => {
    expect(isPopulatedObject(0)).toBe(false);
  });
  it('does not allow strings', () => {
    expect(isPopulatedObject('')).toBe(false);
  });
  it('does not allow null', () => {
    expect(isPopulatedObject(null)).toBe(false);
  });
  it('does not allow an empty object', () => {
    expect(isPopulatedObject({})).toBe(false);
  });
  it('allows an object with an attribute', () => {
    expect(isPopulatedObject({ attribute: 'value' })).toBe(true);
  });
  it('does not allow an object with a non-existing required attribute', () => {
    expect(isPopulatedObject({ attribute: 'value' }, ['otherAttribute'])).toBe(false);
  });
  it('allows an object with an existing required attribute', () => {
    expect(isPopulatedObject({ attribute: 'value' }, ['attribute'])).toBe(true);
  });
  it('allows an object with two existing required attributes', () => {
    expect(
      isPopulatedObject({ attribute1: 'value1', attribute2: 'value2' }, [
        'attribute1',
        'attribute2',
      ])
    ).toBe(true);
  });
  it('does not allow an object with two required attributes where one does not exist', () => {
    expect(
      isPopulatedObject({ attribute1: 'value1', attribute2: 'value2' }, [
        'attribute1',
        'otherAttribute',
      ])
    ).toBe(false);
  });
  it('does not allow an object with a required attribute in the prototype ', () => {
    const testObject = { attribute: 'value', __proto__: { otherAttribute: 'value' } };
    expect(isPopulatedObject(testObject, ['otherAttribute'])).toBe(false);
  });
});

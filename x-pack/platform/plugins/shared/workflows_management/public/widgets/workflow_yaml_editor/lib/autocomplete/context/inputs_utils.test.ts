/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getInputPropertyName,
  isAtInputPropertyDefinition,
  isInInputsPropertiesContext,
} from './inputs_utils';

describe('isInInputsPropertiesContext', () => {
  it.each([
    [['inputs', 'properties'], true],
    [['inputs', 'properties', 'myProp'], true],
    [['inputs', 'properties', 'myProp', 'type'], true],
    [['inputs'], false],
    [['steps', 'properties'], false],
    [[], false],
    [['inputs', 'other'], false],
  ])('returns correct result for path %j', (path, expected) => {
    expect(isInInputsPropertiesContext(path)).toBe(expected);
  });
});

describe('isAtInputPropertyDefinition', () => {
  it.each([
    [['inputs', 'properties', 'myProp'], true],
    [['inputs', 'properties', 'myProp', 'type'], true],
    [['inputs', 'properties'], false],
    [['inputs'], false],
    [['other', 'properties', 'x'], false],
  ])('returns correct result for path %j', (path, expected) => {
    expect(isAtInputPropertyDefinition(path)).toBe(expected);
  });
});

describe('getInputPropertyName', () => {
  it.each([
    [['inputs', 'properties', 'myProp'], 'myProp'],
    [['inputs', 'properties', 'other', 'type'], 'other'],
    [['inputs', 'properties', 0], null],
    [['inputs', 'properties'], null],
    [['inputs'], null],
    [['steps', 'properties', 'x'], null],
  ])('returns correct result for path %j', (path, expected) => {
    expect(getInputPropertyName(path)).toBe(expected);
  });
});

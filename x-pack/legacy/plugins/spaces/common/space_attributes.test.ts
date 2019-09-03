/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSpaceColor, getSpaceInitials } from './space_attributes';

describe('getSpaceColor', () => {
  test('uses color on the space, when provided', () => {
    const space = {
      name: 'Foo',
      color: '#aabbcc',
    };

    expect(getSpaceColor(space)).toEqual('#aabbcc');
  });

  test('derives color from space name if necessary', () => {
    const space = {
      name: 'Foo',
    };

    expect(getSpaceColor(space)).toMatch(/^#[a-f0-9]{6}$/i);
  });

  test('derives the same color for the same name', () => {
    const space = {
      name: 'FooBar',
    };

    const expectedColor = getSpaceColor(space);

    for (let i = 0; i < 100; i++) {
      expect(getSpaceColor(space)).toEqual(expectedColor);
    }
  });
});

describe('getSpaceInitials', () => {
  test('uses initials on the space, when provided', () => {
    const space = {
      name: 'Foo',
      initials: 'JK',
    };

    expect(getSpaceInitials(space)).toEqual('JK');
  });

  test('derives initials from space name if necessary', () => {
    const space = {
      name: 'Foo',
    };

    expect(getSpaceInitials(space)).toEqual('F');
  });

  test('uses words from the space name when deriving initials', () => {
    const space = {
      name: 'Foo Bar',
    };

    expect(getSpaceInitials(space)).toEqual('FB');
  });

  test('only uses the first two words of the space name when deriving initials', () => {
    const space = {
      name: 'Very Special Name',
    };

    expect(getSpaceInitials(space)).toEqual('VS');
  });

  test('maintains case when deriving initials', () => {
    const space = {
      name: 'some Space',
    };

    expect(getSpaceInitials(space)).toEqual('sS');
  });
});

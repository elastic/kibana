/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIcon } from './style_choices';

describe('getIcon', () => {
  it.each([
    ['kubernetesPod', 'kubernetesPod'],
    ['desktop', 'display'],
    ['lettering', 'text'],
  ])('resolves the saved icon "%s" to the "%s" choice', (iconClass, id) => {
    expect(getIcon(iconClass)).toMatchObject({ id, package: 'eui' });
  });

  it('resolves a saved icon object with a legacy id to its current choice', () => {
    expect(getIcon({ id: 'desktop', package: 'eui', label: '', prevName: '' })).toMatchObject({
      id: 'display',
      package: 'eui',
    });
  });

  it('keeps maki icons', () => {
    expect(getIcon('car')).toMatchObject({ id: 'car', package: 'maki' });
  });

  it('resolves legacy Font Awesome names through their previous name', () => {
    expect(getIcon('fa-user')).toMatchObject({ id: 'user', package: 'eui' });
  });

  it('falls back to the empty icon for unknown values', () => {
    expect(getIcon('unknownIcon')).toMatchObject({ id: 'empty' });
  });
});

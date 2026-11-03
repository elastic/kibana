/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  builtinBrowserToolDescriptors,
  builtinBrowserToolIds,
  isBuiltinBrowserToolId,
} from './builtin';

describe('builtinBrowserToolDescriptors', () => {
  it('has one descriptor per builtin id with an object JSON schema', () => {
    const ids = builtinBrowserToolDescriptors.map((d) => d.id).sort();
    expect(ids).toEqual(Object.values(builtinBrowserToolIds).sort());
    builtinBrowserToolDescriptors.forEach((d) =>
      expect(d.schema).toMatchObject({ type: 'object' })
    );
  });
  it('click_element requires ref', () => {
    const d = builtinBrowserToolDescriptors.find((x) => x.id === 'click_element')!;
    expect(d.schema).toMatchObject({ required: ['ref'] });
  });
  it('isBuiltinBrowserToolId', () => {
    expect(isBuiltinBrowserToolId('navigate_to')).toBe(true);
    expect(isBuiltinBrowserToolId('discover_run_query')).toBe(false);
  });
});

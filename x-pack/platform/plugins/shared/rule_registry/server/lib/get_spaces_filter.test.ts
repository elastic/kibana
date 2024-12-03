/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getSpacesFilter } from '.';
describe('getSpacesFilter()', () => {
  it('should return a spaces filter', () => {
    expect(getSpacesFilter('1')).toStrictEqual({
      term: {
        'kibana.space_ids': '1',
      },
    });
  });

  it('should return undefined if no space id is provided', () => {
    expect(getSpacesFilter()).toBeUndefined();
  });
});

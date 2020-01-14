/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseFiltersMap } from '../parse_filter_map';

describe('parseFiltersMap', () => {
  it('provides values from valid filter string', () => {
    expect(
      parseFiltersMap(
        '[["url.port",["5601","80"]],["observer.geo.name",["us-east-2"]],["monitor.type",["http","tcp"]]]'
      )
    ).toMatchSnapshot();
  });

  it('returns an empty object for invalid filter', () => {
    expect(() => parseFiltersMap('some invalid string')).toThrowErrorMatchingSnapshot();
  });
});

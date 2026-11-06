/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamsAppRouter } from '../../routes/config';
import { getIndexInspectBack } from './get_index_inspect_back';

const range = { rangeFrom: 'now-15m', rangeTo: 'now' };

describe('getIndexInspectBack', () => {
  it('goes back to the destinations tab of the unit the page was opened from', () => {
    expect(getIndexInspectBack({ router: streamsAppRouter, unitId: 'edge', ...range })).toEqual({
      href: '/v2/unit/edge/destinations?rangeFrom=now-15m&rangeTo=now',
      label: 'Destinations',
    });
  });

  it('goes back to the V2 landing page without a unit', () => {
    expect(getIndexInspectBack({ router: streamsAppRouter, ...range })).toEqual({
      href: '/v2',
      label: 'Streams',
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { mapSeverity } from '../map_severity';

describe('mapSeverity', () => {
  it('maps [0, 1000) as low', () => {
    const low = {
      value: 'low',
      color: 'warning',
      iconType: 'iInCircle',
      title: 'Low severity alert',
    };

    expect(mapSeverity(-1)).to.not.eql(low);
    expect(mapSeverity(0)).to.eql(low);
    expect(mapSeverity(1)).to.eql(low);
    expect(mapSeverity(500)).to.eql(low);
    expect(mapSeverity(998)).to.eql(low);
    expect(mapSeverity(999)).to.eql(low);
    expect(mapSeverity(1000)).to.not.eql(low);
  });

  it('maps [1000, 2000) as medium', () => {
    const medium = {
      value: 'medium',
      color: 'warning',
      iconType: 'alert',
      title: 'Medium severity alert',
    };

    expect(mapSeverity(999)).to.not.eql(medium);
    expect(mapSeverity(1000)).to.eql(medium);
    expect(mapSeverity(1001)).to.eql(medium);
    expect(mapSeverity(1500)).to.eql(medium);
    expect(mapSeverity(1998)).to.eql(medium);
    expect(mapSeverity(1999)).to.eql(medium);
    expect(mapSeverity(2000)).to.not.eql(medium);
  });

  it('maps (-INF, 0) and [2000, +INF) as high', () => {
    const high = {
      value: 'high',
      color: 'danger',
      iconType: 'bell',
      title: 'High severity alert',
    };

    expect(mapSeverity(-123412456)).to.eql(high);
    expect(mapSeverity(-1)).to.eql(high);
    expect(mapSeverity(0)).to.not.eql(high);
    expect(mapSeverity(1999)).to.not.eql(high);
    expect(mapSeverity(2000)).to.eql(high);
    expect(mapSeverity(2001)).to.eql(high);
    expect(mapSeverity(2500)).to.eql(high);
    expect(mapSeverity(2998)).to.eql(high);
    expect(mapSeverity(2999)).to.eql(high);
    expect(mapSeverity(3000)).to.eql(high);
    expect(mapSeverity(123412456)).to.eql(high);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getMetricChangeDescription } from '../metric_change_description';

describe('ML - metricChangeDescription formatter', () => {
  it('returns correct icon and message if actual > typical', () => {
    expect(getMetricChangeDescription(1.01, 1)).to.eql({
      iconType: 'sortUp',
      message: 'Unusually high',
    });
    expect(getMetricChangeDescription(1.123, 1)).to.eql({
      iconType: 'sortUp',
      message: '1.1x higher',
    });
    expect(getMetricChangeDescription(2, 1)).to.eql({ iconType: 'sortUp', message: '2x higher' });
    expect(getMetricChangeDescription(9.5, 1)).to.eql({
      iconType: 'sortUp',
      message: '10x higher',
    });
    expect(getMetricChangeDescription(1000, 1)).to.eql({
      iconType: 'sortUp',
      message: 'More than 100x higher',
    });
    expect(getMetricChangeDescription(1, 0)).to.eql({
      iconType: 'sortUp',
      message: 'Unexpected non-zero value',
    });
  });

  it('returns correct icon and message if actual < typical', () => {
    expect(getMetricChangeDescription(1, 1.01)).to.eql({
      iconType: 'sortDown',
      message: 'Unusually low',
    });
    expect(getMetricChangeDescription(1, 1.123)).to.eql({
      iconType: 'sortDown',
      message: '1.1x lower',
    });
    expect(getMetricChangeDescription(1, 2)).to.eql({ iconType: 'sortDown', message: '2x lower' });
    expect(getMetricChangeDescription(1, 9.5)).to.eql({
      iconType: 'sortDown',
      message: '10x lower',
    });
    expect(getMetricChangeDescription(1, 1000)).to.eql({
      iconType: 'sortDown',
      message: 'More than 100x lower',
    });
    expect(getMetricChangeDescription(0, 1)).to.eql({
      iconType: 'sortDown',
      message: 'Unexpected zero value',
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getLastValue } from '../get_last_value';

describe('monitoringChartGetLastValue', function() {
  it('getLastValue for single number', () => {
    expect(getLastValue(3)).to.be(3);
  });

  it('return null for non-number / non-array', () => {
    expect(getLastValue('hello')).to.be(null);
    expect(getLastValue(undefined)).to.be(null);
    expect(getLastValue(null)).to.be(null);
  });

  it('return last `y` value for plot data, or zero', () => {
    const plotData1 = [[0, 100], [1, 200], [2, 300], [3, 400], [4, 500]];
    expect(getLastValue(plotData1)).to.be(500);

    const plotData2 = [[0, 100], [1, 200], [2, 300], [3, 400], [4, 0]];
    expect(getLastValue(plotData2)).to.be(0);

    const plotData3 = [[0, 100], [1, 200], [2, 300], [3, 400], [4, -1]];
    expect(getLastValue(plotData3)).to.be(-1);

    const plotData4 = [[0, 100], [1, 200], [2, 300], [3, 400], [4, undefined]];
    expect(getLastValue(plotData4)).to.be(null);

    const plotData5 = [[0, 100], [1, 200], [2, 300], [3, 400], [4, null]];
    expect(getLastValue(plotData5)).to.be(null);
  });
});

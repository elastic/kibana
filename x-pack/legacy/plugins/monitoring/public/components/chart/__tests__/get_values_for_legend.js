/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { findIndexByX, getValuesByX, getValuesForSeriesIndex } from '../get_values_for_legend';

describe('monitoringChartHelpers', function () {
  it('getValuesForSeriesIndex sets does not impact callback without series', () => {
    const callback = sinon.stub();

    getValuesForSeriesIndex([], 0, callback);
    expect(callback.called).to.be(false);
  });

  it('getValuesForSeriesIndex sets callback correctly', () => {
    const expected = {};
    const callback = sinon.spy((series, value) => {
      expected[series] = value;
    });
    const datasets = [
      // 4 series, with all but the first containing 3 points, and one of those has a gap:
      { data: [], id: 'data1' },
      { data: [[15, 1.1], [17, 11.1], null], id: 'data2' },
      {
        data: [
          [15, 2.2],
          [17, 22.2],
          [19, 2560],
        ],
        id: 'data3',
      },
      {
        data: [
          [15, 3.3],
          [17, 33.3],
          [19, null],
        ],
        id: 'data4',
      },
    ];

    getValuesForSeriesIndex(datasets, 0, callback);
    expect(callback.callCount).to.be(4);
    expect(expected.data1).to.eql(null);
    expect(expected.data2).to.eql(1.1);
    expect(expected.data3).to.eql(2.2);
    expect(expected.data4).to.eql(3.3);

    getValuesForSeriesIndex(datasets, 1, callback);
    expect(callback.callCount).to.be(8);
    expect(expected.data1).to.eql(null);
    expect(expected.data2).to.eql(11.1);
    expect(expected.data3).to.eql(22.2);
    expect(expected.data4).to.eql(33.3);

    getValuesForSeriesIndex(datasets, 2, callback);
    expect(callback.callCount).to.be(12);
    expect(expected.data1).to.eql(null);
    expect(expected.data2).to.eql(null);
    expect(expected.data3).to.eql(2560);
    expect(expected.data4).to.eql(null);
  });

  it('getValuesByX calls with the right index', () => {
    // the actual value should be set based on the data from each series
    const expected = {};
    const callback = sinon.spy((series, value) => {
      expected[series] = value;
    });
    const datasets = [
      // 4 series, with all but the first containing 3 points, and one of those has a gap:
      { data: [], id: 'data1' },
      {
        data: [
          [15, 1],
          [17, 11],
          [19, 21],
        ],
        id: 'data2',
      },
      { data: [[15, 2], null, [19, 22]], id: 'data3' },
      {
        data: [
          [15, 3],
          [17, 13],
          [19, 23],
        ],
        id: 'data4',
      },
    ];

    getValuesByX(datasets, 14, callback);
    expect(callback.callCount).to.be(4);
    expect(expected.data1).to.eql(null);
    expect(expected.data2).to.eql(1);
    expect(expected.data3).to.eql(2);
    expect(expected.data4).to.eql(3);

    getValuesByX(datasets, 17, callback);
    expect(callback.callCount).to.be(8);
    expect(expected.data1).to.eql(null);
    expect(expected.data2).to.eql(11);
    expect(expected.data3).to.eql(null);
    expect(expected.data4).to.eql(13);

    getValuesByX(datasets, 20, callback);
    expect(callback.callCount).to.be(12);
    expect(expected.data1).to.eql(null);
    expect(expected.data2).to.eql(21);
    expect(expected.data3).to.eql(22);
    expect(expected.data4).to.eql(23);
  });

  it('findIndexByX returns 0 when only one element exists', () => {
    // the value shouldn't even be considered
    const oneElement = [{}];

    expect(findIndexByX(oneElement, 12345)).to.be(0);
    expect(findIndexByX(oneElement, -12345)).to.be(0);
  });

  it('findIndexByX returns -1 when it is empty', () => {
    expect(findIndexByX([], 12345)).to.be(-1);
    expect(findIndexByX([], -12345)).to.be(-1);
  });

  it('findIndexByX returns correct index without leading data', () => {
    // unlikely edge case where the first (few) values don't exist
    const data = [null, null, [15], [16], [30]];

    // given an equal distance, it should use the one that exceeded the X value
    expect(findIndexByX(data, -500)).to.be(2);
    expect(findIndexByX(data, 0)).to.be(2);
    expect(findIndexByX(data, 5)).to.be(2);
    expect(findIndexByX(data, 7.4999)).to.be(2);
    expect(findIndexByX(data, 7.5)).to.be(2);
    expect(findIndexByX(data, 7.5001)).to.be(2);
    expect(findIndexByX(data, 15)).to.be(2);
    expect(findIndexByX(data, 15.4999)).to.be(2);
    expect(findIndexByX(data, 15.5)).to.be(3);
    expect(findIndexByX(data, 15.5001)).to.be(3);
    expect(findIndexByX(data, 16)).to.be(3);
    expect(findIndexByX(data, 22.9999)).to.be(3);
    expect(findIndexByX(data, 23)).to.be(4);
    expect(findIndexByX(data, 23.0001)).to.be(4);
    expect(findIndexByX(data, 28)).to.be(4);
    expect(findIndexByX(data, 30)).to.be(4);
    expect(findIndexByX(data, 500000)).to.be(4);
  });

  it('findIndexByX returns correct index', () => {
    const data = [[0], null, [15], [16], [30]];

    // given an equal distance, it should use the one that exceeded the X value
    expect(findIndexByX(data, -500)).to.be(0);
    expect(findIndexByX(data, 0)).to.be(0);
    expect(findIndexByX(data, 5)).to.be(0);
    expect(findIndexByX(data, 7.4999)).to.be(0);
    expect(findIndexByX(data, 7.5)).to.be(2);
    expect(findIndexByX(data, 7.5001)).to.be(2);
    expect(findIndexByX(data, 15)).to.be(2);
    expect(findIndexByX(data, 15.4999)).to.be(2);
    expect(findIndexByX(data, 15.5)).to.be(3);
    expect(findIndexByX(data, 15.5001)).to.be(3);
    expect(findIndexByX(data, 16)).to.be(3);
    expect(findIndexByX(data, 22.9999)).to.be(3);
    expect(findIndexByX(data, 23)).to.be(4);
    expect(findIndexByX(data, 23.0001)).to.be(4);
    expect(findIndexByX(data, 28)).to.be(4);
    expect(findIndexByX(data, 30)).to.be(4);
    expect(findIndexByX(data, 500000)).to.be(4);
  });
});

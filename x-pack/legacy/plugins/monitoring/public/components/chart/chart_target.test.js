/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import expect from '@kbn/expect';
import { shallow } from 'enzyme';
import { ChartTarget } from './chart_target';

const props = {
  seriesToShow: ['Max Heap', 'Max Heap Used'],
  series: [
    {
      color: '#3ebeb0',
      label: 'Max Heap',
      id: 'Max Heap',
      data: [
        [1562958960000, 1037959168],
        [1562958990000, 1037959168],
        [1562959020000, 1037959168],
      ],
    },
    {
      color: '#3b73ac',
      label: 'Max Heap Used',
      id: 'Max Heap Used',
      data: [
        [1562958960000, 639905768],
        [1562958990000, 622312416],
        [1562959020000, 555967504],
      ],
    },
  ],
  timeRange: {
    min: 1562958939851,
    max: 1562962539851,
  },
  hasLegend: true,
  onBrush: () => void 0,
  tickFormatter: () => void 0,
  updateLegend: () => void 0,
};

describe('Test legends to toggle series: ', () => {
  const ids = props.series.map(item => item.id);

  it('should toggle based on seriesToShow array', () => {
    const component = shallow(<ChartTarget {...props} />);

    const componentClass = component.instance();

    const seriesA = componentClass.filterData(props.series, [ids[0]]);
    expect(seriesA.length).to.be(1);
    expect(seriesA[0].id).to.be(ids[0]);

    const seriesB = componentClass.filterData(props.series, [ids[1]]);
    expect(seriesB.length).to.be(1);
    expect(seriesB[0].id).to.be(ids[1]);

    const seriesAB = componentClass.filterData(props.series, ids);
    expect(seriesAB.length).to.be(2);
    expect(seriesAB[0].id).to.be(ids[0]);
    expect(seriesAB[1].id).to.be(ids[1]);
  });
});

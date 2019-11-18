/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow, ShallowWrapper } from 'enzyme';
import React from 'react';
import { ChartPlaceHolder } from './chart_place_holder';
import { ChartSeriesData } from './common';

describe('ChartPlaceHolder', () => {
  let shallowWrapper: ShallowWrapper;
  const mockDataAllZeros = [
    {
      key: 'mockKeyA',
      color: 'mockColor',
      value: [
        { x: 'a', y: 0 },
        { x: 'b', y: 0 },
      ],
    },
    {
      key: 'mockKeyB',
      color: 'mockColor',
      value: [
        { x: 'a', y: 0 },
        { x: 'b', y: 0 },
      ],
    },
  ];
  const mockDataUnexpectedValue = [
    {
      key: 'mockKeyA',
      color: 'mockColor',
      value: [
        { x: 'a', y: '' },
        { x: 'b', y: 0 },
      ],
    },
    {
      key: 'mockKeyB',
      color: 'mockColor',
      value: [
        { x: 'a', y: {} },
        { x: 'b', y: 0 },
      ],
    },
  ];

  it('should render with default props', () => {
    const height = `100%`;
    const width = `100%`;
    shallowWrapper = shallow(<ChartPlaceHolder data={mockDataAllZeros} />);
    expect(shallowWrapper.props()).toMatchObject({
      height,
      width,
    });
  });

  it('should render with given props', () => {
    const height = `100px`;
    const width = `100px`;
    shallowWrapper = shallow(
      <ChartPlaceHolder height={height} width={width} data={mockDataAllZeros} />
    );
    expect(shallowWrapper.props()).toMatchObject({
      height,
      width,
    });
  });

  it('should render correct wording when all values returned zero', () => {
    const height = `100px`;
    const width = `100px`;
    shallowWrapper = shallow(
      <ChartPlaceHolder height={height} width={width} data={mockDataAllZeros} />
    );
    expect(
      shallowWrapper
        .find(`[data-test-subj="chartHolderText"]`)
        .childAt(0)
        .text()
    ).toEqual('All values returned zero');
  });

  it('should render correct wording when unexpected value exists', () => {
    const height = `100px`;
    const width = `100px`;
    shallowWrapper = shallow(
      <ChartPlaceHolder
        height={height}
        width={width}
        data={mockDataUnexpectedValue as ChartSeriesData[]}
      />
    );
    expect(
      shallowWrapper
        .find(`[data-test-subj="chartHolderText"]`)
        .childAt(0)
        .text()
    ).toEqual('Chart Data Not Available');
  });
});

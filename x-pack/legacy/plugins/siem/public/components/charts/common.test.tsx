/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow, ShallowWrapper } from 'enzyme';
import * as React from 'react';
import { ChartHolder, getChartHeight, getChartWidth } from './common';

describe('ChartHolder', () => {
  let shallowWrapper: ShallowWrapper;

  it('should render with default props', () => {
    const height = `100%`;
    const width = `100%`;
    shallowWrapper = shallow(<ChartHolder />);
    expect(shallowWrapper.props()).toMatchObject({
      height,
      width,
    });
  });

  it('should render with given props', () => {
    const height = `100px`;
    const width = `100px`;
    shallowWrapper = shallow(<ChartHolder height={height} width={width} />);
    expect(shallowWrapper.props()).toMatchObject({
      height,
      width,
    });
  });
});

describe('getChartHeight', () => {
  it('should render customHeight', () => {
    const height = getChartHeight(10, 100);
    expect(height).toEqual('10px');
  });

  it('should render autoSizerHeight if customHeight is not given', () => {
    const height = getChartHeight(undefined, 100);
    expect(height).toEqual('100px');
  });

  it('should render defaultChartHeight if no custom data is given', () => {
    const height = getChartHeight();
    expect(height).toEqual('100%');
  });
});

describe('getChartWidth', () => {
  it('should render customWidth', () => {
    const height = getChartWidth(10, 100);
    expect(height).toEqual('10px');
  });

  it('should render autoSizerHeight if customHeight is not given', () => {
    const height = getChartWidth(undefined, 100);
    expect(height).toEqual('100px');
  });

  it('should render defaultChartHeight if no custom data is given', () => {
    const height = getChartWidth();
    expect(height).toEqual('100%');
  });
});

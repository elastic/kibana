/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { VisualizationContainer } from './visualization_container';

describe('VisualizationContainer', () => {
  test('renders reporting data attributes when ready', () => {
    const component = mount(<VisualizationContainer isReady={true}>Hello!</VisualizationContainer>);

    const reportingEl = component.find('[data-shared-item]').first();
    expect(reportingEl.prop('data-render-complete')).toBeTruthy();
    expect(reportingEl.prop('data-shared-item')).toBeTruthy();
  });

  test('does not render data attributes when not ready', () => {
    const component = mount(
      <VisualizationContainer isReady={false}>Hello!</VisualizationContainer>
    );

    const reportingEl = component.find('[data-shared-item]').first();
    expect(reportingEl.prop('data-render-complete')).toBeFalsy();
    expect(reportingEl.prop('data-shared-item')).toBeTruthy();
  });

  test('renders child content', () => {
    const component = mount(
      <VisualizationContainer isReady={false}>Hello!</VisualizationContainer>
    );

    expect(component.text()).toEqual('Hello!');
  });

  test('defaults to rendered', () => {
    const component = mount(<VisualizationContainer>Hello!</VisualizationContainer>);
    const reportingEl = component.find('[data-shared-item]').first();

    expect(reportingEl.prop('data-render-complete')).toBeTruthy();
    expect(reportingEl.prop('data-shared-item')).toBeTruthy();
  });

  test('renders title for reporting, if provided', () => {
    const component = mount(
      <VisualizationContainer reportTitle="shazam!">Hello!</VisualizationContainer>
    );
    const reportingEl = component.find('[data-shared-item]').first();

    expect(reportingEl.prop('data-title')).toEqual('shazam!');
  });

  test('renders style', () => {
    const component = mount(
      <VisualizationContainer style={{ color: 'blue' }}>Hello!</VisualizationContainer>
    );
    const reportingEl = component.find('[data-shared-item]').first();

    expect(reportingEl.prop('style')).toEqual({ color: 'blue' });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { HeatmapStyleEditor } from './heatmap_style_editor';

describe('HeatmapStyleEditor', () => {
  test('is rendered', () => {
    const component = shallow(
      <HeatmapStyleEditor
        colorRampName="Blues"
        onHeatmapColorChange={() => {}}
      />
    );

    expect(component)
      .toMatchSnapshot();
  });
});

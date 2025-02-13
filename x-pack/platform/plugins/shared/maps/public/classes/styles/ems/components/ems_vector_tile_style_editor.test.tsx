/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { EMSVectorTileStyleEditor } from './ems_vector_tile_style_editor';

describe('EMSVectorTileStyleEditor', () => {
  test('is rendered', () => {
    const component = shallow(
      <EMSVectorTileStyleEditor color="#4A412A" onColorChange={() => {}} />
    );

    expect(component).toMatchSnapshot();
  });
});

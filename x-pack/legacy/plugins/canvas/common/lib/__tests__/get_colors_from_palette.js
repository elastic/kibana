/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getColorsFromPalette } from '../../lib/get_colors_from_palette';
import {
  grayscalePalette,
  gradientPalette,
} from '../../../canvas_plugin_src/functions/common/__tests__/fixtures/test_styles';

describe('getColorsFromPalette', () => {
  it('returns the array of colors from a palette object when gradient is false', () => {
    expect(getColorsFromPalette(grayscalePalette, 20)).to.eql(grayscalePalette.colors);
  });

  it('returns an array of colors with equidistant colors with length equal to the number of series when gradient is true', () => {
    const result = getColorsFromPalette(gradientPalette, 16);
    expect(result)
      .to.have.length(16)
      .and.to.eql([
        '#ffffff',
        '#eeeeee',
        '#dddddd',
        '#cccccc',
        '#bbbbbb',
        '#aaaaaa',
        '#999999',
        '#888888',
        '#777777',
        '#666666',
        '#555555',
        '#444444',
        '#333333',
        '#222222',
        '#111111',
        '#000000',
      ]);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getLegendConfig } from './get_legend_config';

describe('getLegendConfig', () => {
  describe('show', () => {
    it('hides the legend', () => {
      expect(getLegendConfig(false, 2)).toHaveProperty('show', false);
      expect(getLegendConfig(false, 10)).toHaveProperty('show', false);
    });

    it('hides the legend when there are less than 2 series', () => {
      expect(getLegendConfig(false, 1)).toHaveProperty('show', false);
      expect(getLegendConfig(true, 1)).toHaveProperty('show', false);
    });

    it('shows the legend when there are two or more series', () => {
      expect(getLegendConfig('sw', 2)).toHaveProperty('show', true);
      expect(getLegendConfig(true, 5)).toHaveProperty('show', true);
    });
  });

  describe('position', () => {
    it('sets the position of the legend', () => {
      expect(getLegendConfig('nw')).toHaveProperty('position', 'nw');
      expect(getLegendConfig('ne')).toHaveProperty('position', 'ne');
      expect(getLegendConfig('sw')).toHaveProperty('position', 'sw');
      expect(getLegendConfig('se')).toHaveProperty('position', 'se');
    });

    it("defaults to 'ne'", () => {
      expect(getLegendConfig(true)).toHaveProperty('position', 'ne');
      expect(getLegendConfig('foo')).toHaveProperty('position', 'ne');
    });
  });
});

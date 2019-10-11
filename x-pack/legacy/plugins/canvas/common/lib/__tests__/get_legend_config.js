/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getLegendConfig } from '../get_legend_config';

describe('getLegendConfig', () => {
  describe('show', () => {
    it('hides the legend', () => {
      expect(getLegendConfig(false, 2))
        .to.only.have.key('show')
        .and.to.have.property('show', false);
      expect(getLegendConfig(false, 10))
        .to.only.have.key('show')
        .and.to.have.property('show', false);
    });

    it('hides the legend when there are less than 2 series', () => {
      expect(getLegendConfig(false, 1))
        .to.only.have.key('show')
        .and.to.have.property('show', false);
      expect(getLegendConfig(true, 1))
        .to.only.have.key('show')
        .and.to.have.property('show', false);
    });

    it('shows the legend when there are two or more series', () => {
      expect(getLegendConfig('sw', 2)).to.have.property('show', true);
      expect(getLegendConfig(true, 5)).to.have.property('show', true);
    });
  });

  describe('position', () => {
    it('sets the position of the legend', () => {
      expect(getLegendConfig('nw')).to.have.property('position', 'nw');
      expect(getLegendConfig('ne')).to.have.property('position', 'ne');
      expect(getLegendConfig('sw')).to.have.property('position', 'sw');
      expect(getLegendConfig('se')).to.have.property('position', 'se');
    });

    it("defaults to 'ne'", () => {
      expect(getLegendConfig(true)).to.have.property('position', 'ne');
      expect(getLegendConfig('foo')).to.have.property('position', 'ne');
    });
  });
});

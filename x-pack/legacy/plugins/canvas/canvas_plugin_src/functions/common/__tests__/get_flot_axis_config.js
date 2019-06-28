/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getFlotAxisConfig } from '../plot/get_flot_axis_config';
import { xAxisConfig, yAxisConfig, hideAxis } from './fixtures/test_styles';

describe('getFlotAxisConfig', () => {
  const columns = {
    x: { type: 'string', role: 'dimension', expression: 'project' },
    y: { type: 'date', role: 'dimension', expression: 'location' },
  };

  const ticks = {
    x: { hash: { product1: 2, product2: 1 }, counter: 3 },
    y: { hash: {}, counter: 0 },
  };

  describe('show', () => {
    it('hides the axis', () => {
      expect(getFlotAxisConfig('x', false, { columns, ticks }))
        .to.only.have.key('show')
        .and.to.have.property('show', false);
      expect(getFlotAxisConfig('y', false, { columns, ticks }))
        .to.only.have.key('show')
        .and.to.have.property('show', false);
    });

    it('shows the axis', () => {
      expect(getFlotAxisConfig('x', true, { columns, ticks })).to.have.property('show', true);
      expect(getFlotAxisConfig('y', true, { columns, ticks })).to.have.property('show', true);
    });

    it('sets show using an AxisConfig', () => {
      let result = getFlotAxisConfig('x', xAxisConfig, { columns, ticks });
      expect(result).to.have.property('show', xAxisConfig.show);

      result = getFlotAxisConfig('y', yAxisConfig, { columns, ticks });
      expect(result).to.have.property('show', yAxisConfig.show);

      result = getFlotAxisConfig('x', hideAxis, { columns, ticks });
      expect(result).to.have.property('show', hideAxis.show);

      result = getFlotAxisConfig('y', hideAxis, { columns, ticks });
      expect(result).to.have.property('show', hideAxis.show);
    });
  });

  describe('position', () => {
    it('sets the position of the axis when given an AxisConfig', () => {
      let result = getFlotAxisConfig('x', xAxisConfig, { columns, ticks });
      expect(result).to.have.property('position', xAxisConfig.position);

      result = getFlotAxisConfig('y', yAxisConfig, { columns, ticks });
      expect(result).to.have.property('position', yAxisConfig.position);
    });

    it("defaults position to 'bottom' for the x-axis", () => {
      const invalidXPosition = {
        type: 'axisConfig',
        show: true,
        position: 'left',
      };

      const result = getFlotAxisConfig('x', invalidXPosition, { columns, ticks });
      expect(result).to.have.property('position', 'bottom');
    });

    it("defaults position to 'left' for the y-axis", () => {
      const invalidYPosition = {
        type: 'axisConfig',
        show: true,
        position: 'bottom',
      };

      const result = getFlotAxisConfig('y', invalidYPosition, { columns, ticks });
      expect(result).to.have.property('position', 'left');
    });
  });

  describe('ticks', () => {
    it('adds a tick mark mapping for string columns', () => {
      let result = getFlotAxisConfig('x', true, { columns, ticks });
      expect(result.ticks).to.eql([[2, 'product1'], [1, 'product2']]);

      result = getFlotAxisConfig('x', xAxisConfig, { columns, ticks });
      expect(result.ticks).to.eql([[2, 'product1'], [1, 'product2']]);
    });
  });

  describe('mode', () => {
    it('sets the mode to time for date columns', () => {
      let result = getFlotAxisConfig('y', true, { columns, ticks });
      expect(result).to.have.property('mode', 'time');

      result = getFlotAxisConfig('y', yAxisConfig, { columns, ticks });
      expect(result).to.have.property('mode', 'time');
    });
  });
});

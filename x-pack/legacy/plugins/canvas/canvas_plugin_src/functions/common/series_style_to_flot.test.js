/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { seriesStyleToFlot } from './plot/series_style_to_flot';

describe('seriesStyleToFlot', () => {
  it('returns an empty object if seriesStyle is not provided', () => {
    expect(seriesStyleToFlot(null)).toEqual({});
  });

  const testSeriesStyle = {
    type: 'seriesStyle',
    label: null,
    color: null,
    lines: 0,
    bars: 0,
    points: 0,
    fill: false,
    stack: undefined,
    horizontalBars: false,
  };

  describe('seriesStyle properties', () => {
    describe('color', () => {
      const seriesStyle = { ...testSeriesStyle, color: 'blue' };
      const result = seriesStyleToFlot(seriesStyle);
      it('sets fillColor for lines', () => {
        expect(result.lines).toHaveProperty('fillColor', 'blue');
      });

      it('sets color', () => {
        expect(result).toHaveProperty('color', 'blue');
      });
    });

    describe('lines', () => {
      describe('sets show', () => {
        it('hides line graphs when line width <= 0', () => {
          const seriesStyle = { ...testSeriesStyle };
          expect(seriesStyleToFlot(seriesStyle).lines).toHaveProperty('show', false);
        });

        it('shows line graphs when line width > 0', () => {
          const seriesStyle = { ...testSeriesStyle, lines: 1 };
          expect(seriesStyleToFlot(seriesStyle).lines).toHaveProperty('show', true);
        });
      });

      describe('sets lineWidth', () => {
        it('sets the line width', () => {
          const seriesStyle = { ...testSeriesStyle };
          let result = seriesStyleToFlot(seriesStyle);
          expect(result.lines).toHaveProperty('lineWidth', 0);

          seriesStyle.lines = 1;
          result = seriesStyleToFlot(seriesStyle);
          expect(result.lines).toHaveProperty('lineWidth', 1);

          seriesStyle.lines = 10;
          result = seriesStyleToFlot(seriesStyle);
          expect(result.lines).toHaveProperty('lineWidth', 10);
        });
      });
    });

    describe('bars', () => {
      describe('sets show', () => {
        it('hides bar graphs when bar width <= 0', () => {
          const seriesStyle = { ...testSeriesStyle };
          expect(seriesStyleToFlot(seriesStyle).bars).toHaveProperty('show', false);
        });

        it('shows bar graphs when bar width > 0', () => {
          const seriesStyle = { ...testSeriesStyle, bars: 1 };
          expect(seriesStyleToFlot(seriesStyle).bars).toHaveProperty('show', true);
        });
      });

      describe('sets barWidth', () => {
        it('sets the bar width', () => {
          const seriesStyle = { ...testSeriesStyle };
          let result = seriesStyleToFlot(seriesStyle);
          expect(result.bars).toHaveProperty('barWidth', 0);

          seriesStyle.bars = 1;
          result = seriesStyleToFlot(seriesStyle);
          expect(result.bars).toHaveProperty('barWidth', 1);

          seriesStyle.bars = 10;
          result = seriesStyleToFlot(seriesStyle);
          expect(result.bars).toHaveProperty('barWidth', 10);
        });
      });
    });

    describe('fill', () => {
      it('sets opacity of fill for line graphs', () => {
        const seriesStyle = { ...testSeriesStyle, fill: 10 };
        let result = seriesStyleToFlot(seriesStyle);
        expect(result.lines).toHaveProperty('fill', 1);

        seriesStyle.fill = 5;
        result = seriesStyleToFlot(seriesStyle);
        expect(result.lines).toHaveProperty('fill', 0.5);
      });

      it('sets fill of bubbles', () => {
        const seriesStyle = { ...testSeriesStyle, fill: 10 };
        let result = seriesStyleToFlot(seriesStyle);
        expect(result.bubbles).toHaveProperty('fill', 10);

        seriesStyle.fill = 5;
        result = seriesStyleToFlot(seriesStyle);
        expect(result.bubbles).toHaveProperty('fill', 5);
      });
    });

    describe('stack', () => {
      it('sets stack', () => {
        const seriesStyle = { ...testSeriesStyle, stack: 1 };
        let result = seriesStyleToFlot(seriesStyle);
        expect(result).toHaveProperty('stack', 1);

        seriesStyle.stack = 5;
        result = seriesStyleToFlot(seriesStyle);
        expect(result).toHaveProperty('stack', 5);
      });
    });

    describe('horizontalBars', () => {
      it('sets the orientation of the bar graph', () => {
        const seriesStyle = { ...testSeriesStyle };
        let result = seriesStyleToFlot(seriesStyle);
        expect(result.bars).toHaveProperty('horizontal', false);

        seriesStyle.horizontalBars = true;
        result = seriesStyleToFlot(seriesStyle);
        expect(result.bars).toHaveProperty('horizontal', true);
      });
    });
  });
});

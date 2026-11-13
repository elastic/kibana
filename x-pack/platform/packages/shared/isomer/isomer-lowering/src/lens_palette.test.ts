/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Kibana's own `workoutColorForValue` cases (charts plugin, `services/palettes/helpers.test.ts`), run against the port.

import { lensCellColors, lensPaletteState, workoutColorForValue } from './lens_palette';

type CustomPaletteState = Parameters<typeof workoutColorForValue>[1] & { gradient?: boolean };

describe('workoutColorForValue', () => {
  it('should return no color for empty value', () => {
    expect(
      workoutColorForValue(
        undefined,
        {
          continuity: 'above',
          colors: ['red', 'green', 'blue', 'yellow'],
          range: 'number',
          gradient: false,
          rangeMin: 0,
          rangeMax: 200,
          stops: [],
        },
        { min: 0, max: 200 }
      )
    ).toBeUndefined();
  });

  describe('range: "number"', () => {
    const DEFAULT_PROPS: CustomPaletteState = {
      continuity: 'above',
      colors: ['red', 'green', 'blue', 'yellow'],
      range: 'number',
      gradient: false,
      rangeMin: 0,
      rangeMax: 200,
      stops: [],
    };
    it('find the right color for predefined palettes', () => {
      expect(workoutColorForValue(123, DEFAULT_PROPS, { min: 0, max: 200 })).toBe('blue');
    });

    it('colors the top band for predefined palettes with continuity "none"', () => {
      // empty stops => uniform distribution over [min, max], so the last band is
      // [150, 200] and 190 must resolve to the last color even without max continuity
      expect(
        workoutColorForValue(190, { ...DEFAULT_PROPS, continuity: 'none' }, { min: 0, max: 200 })
      ).toBe('yellow'); // previously undefined
    });

    it('find the right color for custom stops palettes', () => {
      expect(
        workoutColorForValue(
          50,
          {
            ...DEFAULT_PROPS,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('blue');
    });

    it('find the right color for custom stops palettes when value is higher than rangeMax', () => {
      expect(
        workoutColorForValue(
          123,
          {
            ...DEFAULT_PROPS,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('yellow');
      expect(
        workoutColorForValue(
          123,
          {
            ...DEFAULT_PROPS,
            continuity: 'all',
            rangeMax: Infinity,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('yellow');
    });

    it('returns no color if the value if higher than rangeMax and continuity is nor "above" or "all"', () => {
      expect(
        workoutColorForValue(
          123,
          {
            ...DEFAULT_PROPS,
            continuity: 'below',
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
      expect(
        workoutColorForValue(
          123,
          {
            ...DEFAULT_PROPS,
            continuity: 'none',
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
    });

    it('find the right color for custom stops palettes when value is lower than rangeMin', () => {
      expect(
        workoutColorForValue(
          10,
          {
            ...DEFAULT_PROPS,
            continuity: 'below',
            rangeMin: 20,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('red');
      expect(
        workoutColorForValue(
          10,
          {
            ...DEFAULT_PROPS,
            continuity: 'all',
            rangeMin: 20,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('red');
    });

    it('returns no color if the value if lower than rangeMin and continuity is nor "below" or "all"', () => {
      expect(
        workoutColorForValue(
          0,
          {
            ...DEFAULT_PROPS,
            rangeMin: 10,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
      expect(
        workoutColorForValue(
          0,
          {
            ...DEFAULT_PROPS,
            continuity: 'none',
            rangeMin: 10,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
    });
  });

  describe('range: "percent"', () => {
    const DEFAULT_PROPS: CustomPaletteState = {
      continuity: 'above',
      colors: ['red', 'green', 'blue', 'yellow'],
      range: 'percent',
      gradient: false,
      rangeMin: 0,
      rangeMax: 100,
      stops: [],
    };
    it('find the right color for predefined palettes', () => {
      expect(workoutColorForValue(123, DEFAULT_PROPS, { min: 0, max: 200 })).toBe('blue');
    });

    it('colors the top band for predefined palettes with continuity "none"', () => {
      // 190/200 => 95%, last band is [75, 100], so it must resolve to the last color
      // even without max continuity
      expect(
        workoutColorForValue(190, { ...DEFAULT_PROPS, continuity: 'none' }, { min: 0, max: 200 })
      ).toBe('yellow');
    });

    it('find the right color for custom stops palettes', () => {
      expect(
        workoutColorForValue(
          113,
          {
            ...DEFAULT_PROPS,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('blue'); // 113/200 ~ 56%
    });

    it('find the right color for custom stops palettes when value is higher than rangeMax', () => {
      expect(
        workoutColorForValue(
          123,
          {
            ...DEFAULT_PROPS,
            rangeMax: 90,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('yellow');
      expect(
        workoutColorForValue(
          123,
          {
            ...DEFAULT_PROPS,
            continuity: 'all',
            rangeMax: 90,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('yellow');
    });

    it('returns no color if the value if higher than rangeMax and continuity is nor "above" or "all"', () => {
      expect(
        workoutColorForValue(
          190,
          {
            ...DEFAULT_PROPS,
            continuity: 'below',
            rangeMax: 90,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
      expect(
        workoutColorForValue(
          190,
          {
            ...DEFAULT_PROPS,
            continuity: 'none',
            rangeMax: 90,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
    });

    it('find the right color for custom stops palettes when value is lower than rangeMin', () => {
      expect(
        workoutColorForValue(
          10,
          {
            ...DEFAULT_PROPS,
            continuity: 'below',
            rangeMin: 20,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('red');
      expect(
        workoutColorForValue(
          10,
          {
            ...DEFAULT_PROPS,
            continuity: 'all',
            rangeMin: 20,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('red');
    });

    it('returns no color if the value if lower than rangeMin and continuity is nor "below" or "all"', () => {
      expect(
        workoutColorForValue(
          0,
          {
            ...DEFAULT_PROPS,
            continuity: 'above',
            rangeMin: 10,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
      expect(
        workoutColorForValue(
          0,
          {
            ...DEFAULT_PROPS,
            continuity: 'none',
            rangeMin: 10,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
    });
  });
});

describe('lensCellColors', () => {
  const negative = {
    name: 'negative',
    params: {
      rangeType: 'number' as const,
      rangeMin: 0,
      rangeMax: null,
      continuity: 'above' as const,
      stops: [
        { color: '#fcdedc', stop: 0 },
        { color: '#fec3bd', stop: 0.2 },
        { color: '#fea79e', stop: 0.4 },
        { color: '#fb8b81', stop: 0.6 },
        { color: '#f66d64', stop: 0.8 },
      ],
    },
  };

  it('spreads a named palette’s colors evenly over the column’s bounds, as Lens passes it as custom without stops', () => {
    expect(lensPaletteState(negative)).toMatchObject({
      stops: [],
      range: 'number',
      rangeMax: Infinity,
    });
    expect(lensCellColors(negative, [0, 0.25, 0.5, 0.75, 1, null, 'x'])).toEqual([
      '#fcdedc',
      '#fec3bd',
      '#fea79e',
      '#fb8b81',
      '#f66d64',
      null,
      null,
    ]);
  });

  it('keeps a custom palette’s stored stops, which mark where each color ends', () => {
    const custom = {
      ...negative,
      name: 'custom',
      params: {
        ...negative.params,
        stops: [
          { color: '#000001', stop: 10 },
          { color: '#000002', stop: 20 },
        ],
      },
    };
    expect(lensCellColors(custom, [5, 15, 25])).toEqual(['#000001', '#000002', '#000002']);
  });
});

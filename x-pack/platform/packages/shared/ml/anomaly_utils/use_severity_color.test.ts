/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useSeverityColor } from './use_severity_color';

// Mock the EUI dependencies
jest.mock('@elastic/eui', () => {
  const mockSkyBluePalette = ['#dceef7', '#a6d8ec', '#a6d8ec', '#a6d8ec', '#a6d8ec', '#a6d8ec'];
  return {
    useEuiTheme: () => ({
      euiTheme: {
        colors: {
          severity: {
            danger: '#ff0000',
            risk: '#ff9900',
            warning: '#ffcc00',
            unknown: '#ffffff',
          },
        },
      },
    }),
    euiPaletteSkyBlue: () => mockSkyBluePalette,
  };
});
describe('useSeverityColor', () => {
  // Define expected color values based on our mocks
  const expectedColors = {
    low: '#dceef7',
    warning: '#a6d8ec',
    minor: '#ffcc00',
    major: '#ff9900',
    critical: '#ff0000',
    unknown: '#ffffff',
  };
  test('returns correct hex code for low for 0 <= score < 3', () => {
    const { result } = renderHook(() => useSeverityColor(0));
    expect(result.current).toBe(expectedColors.low);

    const { result: result2 } = renderHook(() => useSeverityColor(0.001));
    expect(result2.current).toBe(expectedColors.low);

    const { result: result3 } = renderHook(() => useSeverityColor(2.99));
    expect(result3.current).toBe(expectedColors.low);
  });

  test('returns correct hex code for warning for 3 <= score < 25', () => {
    const { result } = renderHook(() => useSeverityColor(3));
    expect(result.current).toBe(expectedColors.warning);

    const { result: result2 } = renderHook(() => useSeverityColor(24.99));
    expect(result2.current).toBe(expectedColors.warning);
  });

  test('returns correct hex code for minor for 25 <= score < 50', () => {
    const { result } = renderHook(() => useSeverityColor(25));
    expect(result.current).toBe(expectedColors.minor);

    const { result: result2 } = renderHook(() => useSeverityColor(49.99));
    expect(result2.current).toBe(expectedColors.minor);
  });

  test('returns correct hex code for major for 50 <= score < 75', () => {
    const { result } = renderHook(() => useSeverityColor(50));
    expect(result.current).toBe(expectedColors.major);

    const { result: result2 } = renderHook(() => useSeverityColor(74.99));
    expect(result2.current).toBe(expectedColors.major);
  });

  test('returns correct hex code for critical for score >= 75', () => {
    const { result } = renderHook(() => useSeverityColor(75));
    expect(result.current).toBe(expectedColors.critical);

    const { result: result2 } = renderHook(() => useSeverityColor(100));
    expect(result2.current).toBe(expectedColors.critical);

    const { result: result3 } = renderHook(() => useSeverityColor(1000));
    expect(result3.current).toBe(expectedColors.critical);
  });

  test('returns correct hex code for unknown for scores less than 0', () => {
    const { result } = renderHook(() => useSeverityColor(-10));
    expect(result.current).toBe(expectedColors.unknown);
  });
});

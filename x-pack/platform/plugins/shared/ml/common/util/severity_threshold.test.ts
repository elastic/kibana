/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_ANOMALY_THRESHOLD } from '@kbn/ml-anomaly-utils';
import type { SeverityThreshold } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
import {
  applyCustomOpenEndedFloorToSelection,
  getCanonicalBandsOverlappingFloor,
  getSeverityThresholdMax,
  resolveSeverityFormat,
} from './severity_threshold';

describe('getSeverityThresholdMax', () => {
  it('returns the upper bound for a ranged threshold', () => {
    expect(
      getSeverityThresholdMax({ min: ML_ANOMALY_THRESHOLD.MINOR, max: ML_ANOMALY_THRESHOLD.MAJOR })
    ).toBe(ML_ANOMALY_THRESHOLD.MAJOR);
  });

  it('returns undefined for the open-ended critical band', () => {
    expect(getSeverityThresholdMax({ min: ML_ANOMALY_THRESHOLD.CRITICAL })).toBeUndefined();
  });
});

describe('resolveSeverityFormat', () => {
  it('should return the input value when it is already in the new format (array)', () => {
    const newFormatValue: SeverityThreshold[] = [
      { min: 25, max: 50 },
      { min: 50, max: 75 },
    ];

    const result = resolveSeverityFormat(newFormatValue);

    expect(result).toBe(newFormatValue);
  });

  it('should convert a number (old format) to an array of thresholds (new format)', () => {
    const oldFormatValue = 25;

    const result = resolveSeverityFormat(oldFormatValue);

    expect(result).toEqual([
      { min: ML_ANOMALY_THRESHOLD.MINOR, max: ML_ANOMALY_THRESHOLD.MAJOR },
      { min: ML_ANOMALY_THRESHOLD.MAJOR, max: ML_ANOMALY_THRESHOLD.CRITICAL },
      { min: ML_ANOMALY_THRESHOLD.CRITICAL },
    ]);
  });

  it('should include all thresholds when value is 0', () => {
    const oldFormatValue = 0;

    const result = resolveSeverityFormat(oldFormatValue);

    expect(result).toEqual([
      { min: ML_ANOMALY_THRESHOLD.LOW, max: ML_ANOMALY_THRESHOLD.WARNING },
      { min: ML_ANOMALY_THRESHOLD.WARNING, max: ML_ANOMALY_THRESHOLD.MINOR },
      { min: ML_ANOMALY_THRESHOLD.MINOR, max: ML_ANOMALY_THRESHOLD.MAJOR },
      { min: ML_ANOMALY_THRESHOLD.MAJOR, max: ML_ANOMALY_THRESHOLD.CRITICAL },
      { min: ML_ANOMALY_THRESHOLD.CRITICAL },
    ]);
  });

  it('should include only CRITICAL threshold when value is 75', () => {
    const oldFormatValue = 75;

    const result = resolveSeverityFormat(oldFormatValue);

    expect(result).toEqual([{ min: ML_ANOMALY_THRESHOLD.CRITICAL }]);
  });

  it('should include no thresholds when value is greater than CRITICAL', () => {
    const oldFormatValue = 100;

    const result = resolveSeverityFormat(oldFormatValue);

    expect(result).toEqual([]);
  });
});

describe('getCanonicalBandsOverlappingFloor', () => {
  const canonicalBands: SeverityThreshold[] = [
    { min: ML_ANOMALY_THRESHOLD.LOW, max: ML_ANOMALY_THRESHOLD.WARNING },
    { min: ML_ANOMALY_THRESHOLD.WARNING, max: ML_ANOMALY_THRESHOLD.MINOR },
    { min: ML_ANOMALY_THRESHOLD.MINOR, max: ML_ANOMALY_THRESHOLD.MAJOR },
    { min: ML_ANOMALY_THRESHOLD.MAJOR, max: ML_ANOMALY_THRESHOLD.CRITICAL },
    { min: ML_ANOMALY_THRESHOLD.CRITICAL },
  ];

  it('selects minor and above for a custom floor of 30', () => {
    expect(getCanonicalBandsOverlappingFloor(30, canonicalBands)).toEqual([
      { min: ML_ANOMALY_THRESHOLD.MINOR, max: ML_ANOMALY_THRESHOLD.MAJOR },
      { min: ML_ANOMALY_THRESHOLD.MAJOR, max: ML_ANOMALY_THRESHOLD.CRITICAL },
      { min: ML_ANOMALY_THRESHOLD.CRITICAL },
    ]);
  });

  it('selects only critical for a floor of 75', () => {
    expect(getCanonicalBandsOverlappingFloor(75, canonicalBands)).toEqual([
      { min: ML_ANOMALY_THRESHOLD.CRITICAL },
    ]);
  });

  it('selects every band for a floor of 0', () => {
    expect(getCanonicalBandsOverlappingFloor(0, canonicalBands)).toEqual(canonicalBands);
  });
});

describe('applyCustomOpenEndedFloorToSelection', () => {
  const canonicalBands: SeverityThreshold[] = [
    { min: ML_ANOMALY_THRESHOLD.LOW, max: ML_ANOMALY_THRESHOLD.WARNING },
    { min: ML_ANOMALY_THRESHOLD.WARNING, max: ML_ANOMALY_THRESHOLD.MINOR },
    { min: ML_ANOMALY_THRESHOLD.MINOR, max: ML_ANOMALY_THRESHOLD.MAJOR },
    { min: ML_ANOMALY_THRESHOLD.MAJOR, max: ML_ANOMALY_THRESHOLD.CRITICAL },
    { min: ML_ANOMALY_THRESHOLD.CRITICAL },
  ];

  it('keeps the custom open-ended floor when the remaining selection still covers floor-to-100', () => {
    expect(
      applyCustomOpenEndedFloorToSelection(
        [
          { min: ML_ANOMALY_THRESHOLD.MINOR, max: ML_ANOMALY_THRESHOLD.MAJOR },
          { min: ML_ANOMALY_THRESHOLD.MAJOR, max: ML_ANOMALY_THRESHOLD.CRITICAL },
          { min: ML_ANOMALY_THRESHOLD.CRITICAL },
        ],
        [{ min: 30 }]
      )
    ).toEqual([{ min: 30 }]);
  });

  it('drops the partial first band when higher bands are toggled off', () => {
    expect(
      applyCustomOpenEndedFloorToSelection(
        [
          { min: ML_ANOMALY_THRESHOLD.MINOR, max: ML_ANOMALY_THRESHOLD.MAJOR },
          { min: ML_ANOMALY_THRESHOLD.MAJOR, max: ML_ANOMALY_THRESHOLD.CRITICAL },
        ],
        [{ min: 30 }]
      )
    ).toEqual([{ min: ML_ANOMALY_THRESHOLD.MAJOR, max: ML_ANOMALY_THRESHOLD.CRITICAL }]);
  });

  it('drops the partial first band when a middle overlapping band is toggled off', () => {
    expect(
      applyCustomOpenEndedFloorToSelection(
        [
          { min: ML_ANOMALY_THRESHOLD.MINOR, max: ML_ANOMALY_THRESHOLD.MAJOR },
          { min: ML_ANOMALY_THRESHOLD.CRITICAL },
        ],
        [{ min: 30 }]
      )
    ).toEqual([{ min: ML_ANOMALY_THRESHOLD.CRITICAL }]);
  });

  it('uses canonical bands when the user expands below the original floor', () => {
    expect(applyCustomOpenEndedFloorToSelection(canonicalBands.slice(1), [{ min: 30 }])).toEqual(
      canonicalBands.slice(1)
    );
  });

  it('leaves canonical selections unchanged', () => {
    expect(
      applyCustomOpenEndedFloorToSelection(
        [{ min: ML_ANOMALY_THRESHOLD.MAJOR, max: ML_ANOMALY_THRESHOLD.CRITICAL }],
        [{ min: ML_ANOMALY_THRESHOLD.MAJOR, max: ML_ANOMALY_THRESHOLD.CRITICAL }]
      )
    ).toEqual([{ min: ML_ANOMALY_THRESHOLD.MAJOR, max: ML_ANOMALY_THRESHOLD.CRITICAL }]);
  });
});

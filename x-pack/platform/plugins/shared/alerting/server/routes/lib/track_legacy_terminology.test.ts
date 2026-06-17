/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { trackLegacyTerminology, LEGACY_TERMS } from './track_legacy_terminology';

describe('trackLegacyTerminology', () => {
  it('should call `usageCounter.incrementCounter`', () => {
    const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
    const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

    trackLegacyTerminology(
      ['shouldNotMatch', LEGACY_TERMS.map((lt) => `${lt}foo`)],
      mockUsageCounter
    );
    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(LEGACY_TERMS.length);
    LEGACY_TERMS.forEach((legacyTerm, index) => {
      expect((mockUsageCounter.incrementCounter as jest.Mock).mock.calls[index][0]).toStrictEqual({
        counterName: `legacyTerm_${legacyTerm}`,
        counterType: 'legacyTerminology',
        incrementBy: 1,
      });
    });
  });

  it('should do nothing if no usage counter is provided', () => {
    let err;
    try {
      trackLegacyTerminology(['test'], undefined);
    } catch (e) {
      err = e;
    }
    expect(err).toBeUndefined();
  });

  it('should do nothing if no terms are provided', () => {
    let err;
    try {
      trackLegacyTerminology([], undefined);
    } catch (e) {
      err = e;
    }
    expect(err).toBeUndefined();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapDeletePhaseToFormValues, mapFormValuesToDeletePhase } from './mappers';

describe('edit delete phase flyout mappers', () => {
  describe('mapDeletePhaseToFormValues()', () => {
    it('uses the default retention when initial value indicates default retention', () => {
      expect(
        mapDeletePhaseToFormValues({
          defaultRetentionPeriod: '60d',
          initialValue: {
            deletePhaseEnabled: true,
            dataRetention: '14d',
            isDefaultRetention: true,
          },
        })
      ).toEqual({
        minAgeValue: '60',
        minAgeUnit: 'd',
        isUsingDefaultRetention: true,
      });
    });

    it('falls back to the initial retention when default retention is missing', () => {
      expect(
        mapDeletePhaseToFormValues({
          defaultRetentionPeriod: undefined,
          initialValue: {
            deletePhaseEnabled: true,
            dataRetention: '14d',
            isDefaultRetention: true,
          },
        })
      ).toEqual({
        minAgeValue: '14',
        minAgeUnit: 'd',
        isUsingDefaultRetention: true,
      });
    });

    it('uses the initial retention when not using the default retention', () => {
      expect(
        mapDeletePhaseToFormValues({
          defaultRetentionPeriod: '60d',
          initialValue: {
            deletePhaseEnabled: true,
            dataRetention: '14d',
            isDefaultRetention: false,
          },
        })
      ).toEqual({
        minAgeValue: '14',
        minAgeUnit: 'd',
        isUsingDefaultRetention: false,
      });
    });

    it('uses the default retention when the delete phase is disabled', () => {
      expect(
        mapDeletePhaseToFormValues({
          defaultRetentionPeriod: '60d',
          initialValue: {
            deletePhaseEnabled: false,
          },
        })
      ).toEqual({
        minAgeValue: '60',
        minAgeUnit: 'd',
        isUsingDefaultRetention: false,
      });
    });

    it('falls back to the default retention fallback when both delete phase and default retention are missing', () => {
      expect(
        mapDeletePhaseToFormValues({
          defaultRetentionPeriod: undefined,
          initialValue: {
            deletePhaseEnabled: false,
          },
        })
      ).toEqual({
        minAgeValue: '30',
        minAgeUnit: 'd',
        isUsingDefaultRetention: false,
      });
    });
  });

  it('falls back to deletePhaseEnabled: false when minAgeValue is invalid', () => {
    expect(
      mapFormValuesToDeletePhase({
        minAgeValue: '',
        minAgeUnit: 'd',
        isUsingDefaultRetention: false,
      })
    ).toEqual({
      deletePhaseEnabled: false,
    });
  });

  it('maps to a delete phase when the retention is valid', () => {
    expect(
      mapFormValuesToDeletePhase({
        minAgeValue: '0',
        minAgeUnit: 'd',
        isUsingDefaultRetention: false,
      })
    ).toEqual({
      deletePhaseEnabled: true,
      dataRetention: '0d',
      isDefaultRetention: false,
    });
  });
});

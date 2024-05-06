/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  ALERT_INSTANCE_ID,
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_SUPPRESSION_END,
  ALERT_SUPPRESSION_START,
  ALERT_RULE_EXECUTION_UUID,
} from '@kbn/rule-data-utils';

import {
  suppressAlertsInMemory,
  isExistingDateGtEqThanAlert,
  getUpdatedSuppressionBoundaries,
  BackendAlertWithSuppressionFields870,
} from './create_persistence_rule_type_wrapper';

describe('suppressAlertsInMemory', () => {
  it('should correctly suppress alerts', () => {
    const alerts = [
      {
        _id: 'alert-a',
        _source: {
          [ALERT_SUPPRESSION_DOCS_COUNT]: 10,
          [ALERT_INSTANCE_ID]: 'instance-id-1',
          [ALERT_SUPPRESSION_START]: new Date('2020-10-28T05:45:00.000Z'),
          [ALERT_SUPPRESSION_END]: new Date('2020-10-28T05:45:00.000Z'),
        },
      },
      {
        _id: 'alert-b',
        _source: {
          [ALERT_SUPPRESSION_DOCS_COUNT]: 2,
          [ALERT_INSTANCE_ID]: 'instance-id-1',
          [ALERT_SUPPRESSION_START]: new Date('2020-10-28T05:15:00.000Z'),
          [ALERT_SUPPRESSION_END]: new Date('2020-10-28T05:15:00.000Z'),
        },
      },
      {
        _id: 'alert-c',
        _source: {
          [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
          [ALERT_INSTANCE_ID]: 'instance-id-1',
          [ALERT_SUPPRESSION_START]: new Date('2020-10-28T05:18:00.000Z'),
          [ALERT_SUPPRESSION_END]: new Date('2020-10-28T05:18:00.000Z'),
        },
      },
    ];

    const { alertCandidates, suppressedAlerts } = suppressAlertsInMemory(alerts);

    // 1 alert left, rest suppressed
    expect(alertCandidates.length).toBe(1);
    expect(suppressedAlerts.length).toBe(2);

    // 1 suppressed alert only
    expect(alertCandidates[0]._source[ALERT_SUPPRESSION_DOCS_COUNT]).toBe(14);

    // alert candidate should be alert with oldest suppression date
    expect(alertCandidates[0]._id).toBe('alert-b');
    expect(alertCandidates[0]._source[ALERT_SUPPRESSION_START].toISOString()).toBe(
      '2020-10-28T05:15:00.000Z'
    );
    // suppression end should be latest date
    expect(alertCandidates[0]._source[ALERT_SUPPRESSION_END].toISOString()).toBe(
      '2020-10-28T05:45:00.000Z'
    );
  });

  it('should suppress by multiple instance ids', () => {
    const alerts = [
      {
        _id: 'alert-a',
        _source: {
          [ALERT_SUPPRESSION_DOCS_COUNT]: 10,
          [ALERT_INSTANCE_ID]: 'instance-id-1',
          [ALERT_SUPPRESSION_START]: new Date('2020-10-28T05:45:00.000Z'),
          [ALERT_SUPPRESSION_END]: new Date('2020-10-28T05:45:00.000Z'),
        },
      },
      {
        _id: 'alert-b',
        _source: {
          [ALERT_SUPPRESSION_DOCS_COUNT]: 2,
          [ALERT_INSTANCE_ID]: 'instance-id-1',
          [ALERT_SUPPRESSION_START]: new Date('2020-10-28T05:15:00.000Z'),
          [ALERT_SUPPRESSION_END]: new Date('2020-10-28T05:15:00.000Z'),
        },
      },
      {
        _id: 'alert-c',
        _source: {
          [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
          [ALERT_INSTANCE_ID]: 'instance-id-1',
          [ALERT_SUPPRESSION_START]: new Date('2020-10-28T05:18:00.000Z'),
          [ALERT_SUPPRESSION_END]: new Date('2020-10-28T05:18:00.000Z'),
        },
      },
      {
        _id: 'alert-0',
        _source: {
          [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
          [ALERT_INSTANCE_ID]: 'instance-id-2',
          [ALERT_SUPPRESSION_START]: new Date('2020-10-28T05:18:00.000Z'),
          [ALERT_SUPPRESSION_END]: new Date('2020-10-28T05:18:00.000Z'),
        },
      },
      {
        _id: 'alert-0',
        _source: {
          [ALERT_SUPPRESSION_DOCS_COUNT]: 1,
          [ALERT_INSTANCE_ID]: 'instance-id-2',
          [ALERT_SUPPRESSION_START]: new Date('2020-10-28T05:18:00.000Z'),
          [ALERT_SUPPRESSION_END]: new Date('2020-10-28T05:18:00.000Z'),
        },
      },
    ];

    const { alertCandidates, suppressedAlerts } = suppressAlertsInMemory(alerts);

    // 1 alert left, rest suppressed
    expect(alertCandidates.length).toBe(2);
    expect(suppressedAlerts.length).toBe(3);

    // 'instance-id-1'
    expect(alertCandidates[0]._source[ALERT_SUPPRESSION_DOCS_COUNT]).toBe(14);
    // 'instance-id-2',
    expect(alertCandidates[1]._source[ALERT_SUPPRESSION_DOCS_COUNT]).toBe(2);
  });
  it('should not suppress alerts if no common instance ids', () => {
    const alerts = [
      {
        _id: 'alert-a',
        _source: {
          [ALERT_SUPPRESSION_DOCS_COUNT]: 10,
          [ALERT_INSTANCE_ID]: 'instance-id-1',
          [ALERT_SUPPRESSION_START]: new Date('2020-10-28T05:45:00.000Z'),
          [ALERT_SUPPRESSION_END]: new Date('2020-10-28T05:45:00.000Z'),
        },
      },
      {
        _id: 'alert-b',
        _source: {
          [ALERT_SUPPRESSION_DOCS_COUNT]: 2,
          [ALERT_INSTANCE_ID]: 'instance-id-2',
          [ALERT_SUPPRESSION_START]: new Date('2020-10-28T05:15:00.000Z'),
          [ALERT_SUPPRESSION_END]: new Date('2020-10-28T05:15:00.000Z'),
        },
      },
      {
        _id: 'alert-c',
        _source: {
          [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
          [ALERT_INSTANCE_ID]: 'instance-id-3',
          [ALERT_SUPPRESSION_START]: new Date('2020-10-28T05:18:00.000Z'),
          [ALERT_SUPPRESSION_END]: new Date('2020-10-28T05:18:00.000Z'),
        },
      },
    ];

    const { alertCandidates, suppressedAlerts } = suppressAlertsInMemory(alerts);

    // no alerts should be suppressed
    expect(alertCandidates.length).toBe(3);
    expect(suppressedAlerts.length).toBe(0);
  });
});

describe('isExistingDateGtEqThanAlert', () => {
  it('should return false if existing alert source is undefined', () => {
    expect(
      isExistingDateGtEqThanAlert(
        { _source: undefined, _id: 'a1', _index: 'test-index' },
        {
          _id: 'alert-a',
          _source: {
            [ALERT_SUPPRESSION_START]: new Date('2020-10-28T05:45:00.000Z'),
            [ALERT_SUPPRESSION_END]: new Date('2020-10-28T05:45:00.000Z'),
          },
        },
        ALERT_SUPPRESSION_START
      )
    ).toBe(false);
  });
  it('should return false if existing alert date is older', () => {
    expect(
      isExistingDateGtEqThanAlert(
        {
          _source: { [ALERT_SUPPRESSION_START]: '2020-10-28T05:42:00.000Z' },
          _id: 'a1',
          _index: 'test-index',
        } as estypes.SearchHit<BackendAlertWithSuppressionFields870<{}>>,
        {
          _id: 'alert-a',
          _source: {
            [ALERT_SUPPRESSION_START]: new Date('2020-10-28T05:45:00.000Z'),
            [ALERT_SUPPRESSION_END]: new Date('2020-10-28T05:45:00.000Z'),
          },
        },
        ALERT_SUPPRESSION_START
      )
    ).toBe(false);
  });

  it('should return true if existing alert date is greater', () => {
    expect(
      isExistingDateGtEqThanAlert(
        {
          _source: { [ALERT_SUPPRESSION_START]: '2020-10-28T05:50:00.000Z' },
          _id: 'a1',
          _index: 'test-index',
        } as estypes.SearchHit<BackendAlertWithSuppressionFields870<{}>>,
        {
          _id: 'alert-a',
          _source: {
            [ALERT_SUPPRESSION_START]: new Date('2020-10-28T05:45:00.000Z'),
            [ALERT_SUPPRESSION_END]: new Date('2020-10-28T05:45:00.000Z'),
          },
        },
        ALERT_SUPPRESSION_START
      )
    ).toBe(true);
  });

  it('should return true if existing alert date is the same as alert', () => {
    expect(
      isExistingDateGtEqThanAlert(
        {
          _source: { [ALERT_SUPPRESSION_START]: '2020-10-28T05:42:00.000Z' },
          _id: 'a1',
          _index: 'test-index',
        } as estypes.SearchHit<BackendAlertWithSuppressionFields870<{}>>,
        {
          _id: 'alert-a',
          _source: {
            [ALERT_SUPPRESSION_START]: new Date('2020-10-28T05:42:00.000Z'),
            [ALERT_SUPPRESSION_END]: new Date('2020-10-28T05:45:00.000Z'),
          },
        },
        ALERT_SUPPRESSION_START
      )
    ).toBe(true);
  });
});

describe('getUpdatedSuppressionBoundaries', () => {
  it('should not return suppression end if existing alert has later date', () => {
    const boundaries = getUpdatedSuppressionBoundaries(
      {
        _source: { [ALERT_SUPPRESSION_END]: '2020-10-28T06:00:00.000Z' },
        _id: 'a1',
        _index: 'test-index',
      } as estypes.SearchHit<BackendAlertWithSuppressionFields870<{}>>,
      {
        _id: 'alert-a',
        _source: {
          [ALERT_SUPPRESSION_START]: new Date('2020-10-28T05:42:00.000Z'),
          [ALERT_SUPPRESSION_END]: new Date('2020-10-28T05:45:00.000Z'),
        },
      },
      'mock-id'
    );
    expect(boundaries[ALERT_SUPPRESSION_END]).toBeUndefined();
  });

  it('should return updated suppression end if existing alert has older date', () => {
    const boundaries = getUpdatedSuppressionBoundaries(
      {
        _source: { [ALERT_SUPPRESSION_END]: '2020-10-28T05:00:00.000Z' },
        _id: 'a1',
        _index: 'test-index',
      } as estypes.SearchHit<BackendAlertWithSuppressionFields870<{}>>,
      {
        _id: 'alert-a',
        _source: {
          [ALERT_SUPPRESSION_START]: new Date('2020-10-28T05:42:00.000Z'),
          [ALERT_SUPPRESSION_END]: new Date('2020-10-28T05:45:00.000Z'),
        },
      },
      'mock-id'
    );
    expect(boundaries[ALERT_SUPPRESSION_END]?.toISOString()).toBe('2020-10-28T05:45:00.000Z');
  });

  it('should not return suppression start if existing alert has older date and matches rule execution id', () => {
    const boundaries = getUpdatedSuppressionBoundaries(
      {
        _source: {
          [ALERT_SUPPRESSION_START]: '2020-10-28T05:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'mock-id',
        },
        _id: 'a1',
        _index: 'test-index',
      } as estypes.SearchHit<BackendAlertWithSuppressionFields870<{}>>,
      {
        _id: 'alert-a',
        _source: {
          [ALERT_SUPPRESSION_START]: new Date('2020-10-28T05:42:00.000Z'),
          [ALERT_SUPPRESSION_END]: new Date('2020-10-28T05:45:00.000Z'),
        },
      },
      'mock-id'
    );
    expect(boundaries[ALERT_SUPPRESSION_START]).toBeUndefined();
  });

  it('should return updated suppression start if existing alert has later date and matches rule execution id', () => {
    const boundaries = getUpdatedSuppressionBoundaries(
      {
        _source: {
          [ALERT_SUPPRESSION_START]: '2020-10-28T06:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'mock-id',
        },
        _id: 'a1',
        _index: 'test-index',
      } as estypes.SearchHit<BackendAlertWithSuppressionFields870<{}>>,
      {
        _id: 'alert-a',
        _source: {
          [ALERT_SUPPRESSION_START]: new Date('2020-10-28T05:42:00.000Z'),
          [ALERT_SUPPRESSION_END]: new Date('2020-10-28T05:45:00.000Z'),
        },
      },
      'mock-id'
    );
    expect(boundaries[ALERT_SUPPRESSION_START]?.toISOString()).toBe('2020-10-28T05:42:00.000Z');
  });

  it('should not return  suppression start if existing alert has later date but not matches rule execution id', () => {
    const boundaries = getUpdatedSuppressionBoundaries(
      {
        _source: {
          [ALERT_SUPPRESSION_START]: '2020-10-28T06:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'mock-id-prev-rule-execution',
        },
        _id: 'a1',
        _index: 'test-index',
      } as estypes.SearchHit<BackendAlertWithSuppressionFields870<{}>>,
      {
        _id: 'alert-a',
        _source: {
          [ALERT_SUPPRESSION_START]: new Date('2020-10-28T05:42:00.000Z'),
          [ALERT_SUPPRESSION_END]: new Date('2020-10-28T05:45:00.000Z'),
        },
      },
      'mock-id'
    );
    expect(boundaries[ALERT_SUPPRESSION_START]).toBeUndefined();
  });
});

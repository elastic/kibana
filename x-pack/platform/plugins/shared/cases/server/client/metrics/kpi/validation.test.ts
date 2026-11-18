/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKpiMetricFieldError, getKpiMetricQueryError } from './validation';

describe('getKpiMetricFieldError', () => {
  it('accepts a count with no field', () => {
    expect(getKpiMetricFieldError({ index: 'cases' })).toBeUndefined();
    expect(getKpiMetricFieldError({ index: 'cases', aggregation: { type: 'count' } })).toBe(
      undefined
    );
  });

  it('accepts a numeric field for a numeric aggregation', () => {
    expect(
      getKpiMetricFieldError({
        index: 'cases',
        aggregation: { type: 'median', field: 'case.time_to_resolve' },
      })
    ).toBeUndefined();
  });

  it('rejects a numeric aggregation with no field', () => {
    expect(getKpiMetricFieldError({ index: 'cases', aggregation: { type: 'avg' } })).toBe(
      'The avg aggregation needs a field.'
    );
  });

  it('rejects a field that is not in the catalog of the index', () => {
    expect(
      getKpiMetricFieldError({
        index: 'activity',
        aggregation: { type: 'avg', field: 'case.time_to_resolve' },
      })
    ).toBe('The field case.time_to_resolve is not allowed for the activity index.');
  });

  it('rejects a keyword field for a numeric aggregation', () => {
    expect(
      getKpiMetricFieldError({
        index: 'cases',
        aggregation: { type: 'sum', field: 'case.status' },
      })
    ).toBe('The sum aggregation needs a numeric field. case.status is not a numeric field.');
  });

  it('rejects a numeric field for a unique count', () => {
    expect(
      getKpiMetricFieldError({
        index: 'cases',
        aggregation: { type: 'cardinality', field: 'case.total_alerts' },
      })
    ).toBe('The unique count needs a keyword field. case.total_alerts is not a keyword field.');
  });

  it('accepts a unique count on the closer of the case', () => {
    expect(
      getKpiMetricFieldError({
        index: 'cases',
        aggregation: { type: 'cardinality', field: 'case.closed_by.username' },
      })
    ).toBeUndefined();
  });

  it('accepts a unique count on the attachment ids', () => {
    expect(
      getKpiMetricFieldError({
        index: 'attachments',
        aggregation: { type: 'cardinality', field: 'attachment.attachment_id' },
      })
    ).toBeUndefined();
  });

  it('rejects an average on the attachment ids', () => {
    expect(
      getKpiMetricFieldError({
        index: 'attachments',
        aggregation: { type: 'avg', field: 'attachment.attachment_id' },
      })
    ).toBe(
      'The avg aggregation needs a numeric field. attachment.attachment_id is not a numeric field.'
    );
  });

  describe('date field', () => {
    it('rejects a date field on the activity index', () => {
      expect(getKpiMetricFieldError({ index: 'activity', dateField: 'closed_at' })).toBe(
        'The date field closed_at is not allowed for the activity index.'
      );
    });

    it('rejects a date field on the attachments index', () => {
      expect(getKpiMetricFieldError({ index: 'attachments', dateField: 'created_at' })).toBe(
        'The date field created_at is not allowed for the attachments index.'
      );
    });

    it('accepts a date field on the cases index', () => {
      expect(getKpiMetricFieldError({ index: 'cases', dateField: 'closed_at' })).toBeUndefined();
      expect(
        getKpiMetricFieldError({
          index: 'cases',
          dateField: 'closed_at',
          aggregation: { type: 'median', field: 'case.time_to_resolve' },
        })
      ).toBeUndefined();
    });
  });

  describe('group by', () => {
    it.each(['case.severity', 'case.tags', 'case.assignees.uid'])(
      'accepts the keyword field %s on the cases index',
      (field) => {
        expect(getKpiMetricFieldError({ index: 'cases', groupBy: { field } })).toBeUndefined();
      }
    );

    it('accepts a keyword field on the activity index', () => {
      expect(
        getKpiMetricFieldError({ index: 'activity', groupBy: { field: 'actor.username' } })
      ).toBeUndefined();
    });

    it('rejects a field that is not a keyword field', () => {
      expect(getKpiMetricFieldError({ index: 'cases', groupBy: { field: 'case.duration' } })).toBe(
        'The breakdown needs a keyword field of the cases index. case.duration is not allowed.'
      );
    });

    it('rejects an unknown field', () => {
      expect(getKpiMetricFieldError({ index: 'cases', groupBy: { field: 'case.foo' } })).toBe(
        'The breakdown needs a keyword field of the cases index. case.foo is not allowed.'
      );
    });

    it('accepts a keyword extended field on the cases index', () => {
      expect(
        getKpiMetricFieldError({
          index: 'cases',
          groupBy: { field: 'case.extended_fields.team_as_keyword' },
        })
      ).toBeUndefined();
    });

    it.each([
      ['cases', 'case.extended_fields.score_as_long'],
      ['cases', 'case.extended_fields.a.b_as_keyword'],
      ['activity', 'case.extended_fields.team_as_keyword'],
    ] as const)('rejects the extended field on the %s index: %s', (index, field) => {
      expect(getKpiMetricFieldError({ index, groupBy: { field } })).toBe(
        `The breakdown needs a keyword field of the ${index} index. ${field} is not allowed.`
      );
    });

    it('rejects an aggregation that is not a count', () => {
      expect(
        getKpiMetricFieldError({
          index: 'cases',
          groupBy: { field: 'case.severity' },
          aggregation: { type: 'avg', field: 'case.duration' },
        })
      ).toBe('A breakdown counts the documents. It cannot use an aggregation.');
    });

    it('rejects a percent', () => {
      expect(
        getKpiMetricFieldError({
          index: 'cases',
          groupBy: { field: 'case.severity' },
          percent: true,
        })
      ).toBe('A breakdown cannot show a percent.');
    });

    it('rejects a threshold', () => {
      expect(
        getKpiMetricFieldError({
          index: 'cases',
          groupBy: { field: 'case.severity' },
          threshold: { comparator: 'above', value: 10 },
        })
      ).toBe('A breakdown cannot have a threshold.');
    });
  });
});

describe('getKpiMetricQueryError', () => {
  it('accepts an empty query', () => {
    expect(getKpiMetricQueryError('')).toBeUndefined();
  });

  it('accepts a valid query', () => {
    expect(getKpiMetricQueryError('case.status: closed and case.severity: critical')).toBe(
      undefined
    );
  });

  it('rejects an unbalanced query', () => {
    expect(getKpiMetricQueryError('status: closed or (space_id: *')).toContain(
      'The KQL query is not valid'
    );
  });

  describe('percent', () => {
    it('accepts a percent count', () => {
      expect(getKpiMetricFieldError({ index: 'cases', percent: true })).toBeUndefined();
    });

    it('rejects a percent metric with an aggregation', () => {
      expect(
        getKpiMetricFieldError({
          index: 'cases',
          percent: true,
          aggregation: { type: 'sum', field: 'case.total_alerts' },
        })
      ).toBe('A percent metric counts the documents. It cannot use an aggregation.');
    });
  });
});

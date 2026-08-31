/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Characterization tests for the SLO CRUD route schemas.
 *
 * They pin the current decode/encode behavior through the codec-agnostic helpers
 * in ../../test_helpers/codec_agnostic, so the exact same expectations must keep
 * passing once each schema is migrated to zod. Error message contents and
 * unknown-key strictness are intentionally not asserted: both are owned by the
 * validation layers above this package.
 */

import { Duration, DurationUnit } from '../../models/duration';
import {
  allWireIndicators,
  buildDomainSLO,
  buildDomainSLOWithData,
  buildWireSLO,
} from '../../test_helpers/fixtures';
import { decode, encode } from '../../test_helpers/codec_agnostic';
import { createSLOParamsSchema, createSLOResponseSchema } from './create';
import { deleteSLOParamsSchema } from './delete';
import { findSLOParamsSchema, findSLOResponseSchema } from './find';
import { getSLOParamsSchema, getSLOResponseSchema } from './get';
import { manageSLOParamsSchema } from './manage';
import { resetSLOParamsSchema, resetSLOResponseSchema } from './reset';
import { updateSLOParamsSchema, updateSLOResponseSchema } from './update';

const VALID_ID = 'my-slo-id01';

const minimalCreateBody = {
  name: 'my slo',
  description: 'my slo description',
  indicator: allWireIndicators[0],
  timeWindow: { duration: '30d', type: 'rolling' },
  budgetingMethod: 'occurrences',
  objective: { target: 0.99 },
};

describe('createSLOParamsSchema', () => {
  it.each(allWireIndicators.map((indicator) => [indicator.type, indicator]))(
    'accepts a minimal payload with a %s indicator',
    (_type, indicator) => {
      const result = decode(createSLOParamsSchema, { body: { ...minimalCreateBody, indicator } });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.body.indicator).toEqual(indicator);
        expect(result.value.body.timeWindow.duration).toBeInstanceOf(Duration);
      }
    }
  );

  it('accepts a payload with all optional fields', () => {
    const result = decode(createSLOParamsSchema, {
      body: {
        ...minimalCreateBody,
        id: VALID_ID,
        settings: { syncDelay: '5m', frequency: '1m', projectRoutings: '_alias:_origin' },
        tags: ['critical'],
        groupBy: ['host.name', 'service.name'],
        revision: 2,
        artifacts: { dashboards: [{ id: 'dashboard-id' }] },
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.body.id).toBe(VALID_ID);
      expect(result.value.body.settings?.syncDelay).toBeInstanceOf(Duration);
      expect(result.value.body.groupBy).toEqual(['host.name', 'service.name']);
    }
  });

  it('accepts a timeslices objective with a timeslice window duration', () => {
    const result = decode(createSLOParamsSchema, {
      body: {
        ...minimalCreateBody,
        budgetingMethod: 'timeslices',
        objective: { target: 0.98, timesliceTarget: 0.95, timesliceWindow: '2m' },
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.body.objective.timesliceWindow).toBeInstanceOf(Duration);
      expect(
        result.value.body.objective.timesliceWindow?.isEqual(new Duration(2, DurationUnit.Minute))
      ).toBe(true);
    }
  });

  it.each(['name', 'description', 'indicator', 'timeWindow', 'budgetingMethod', 'objective'])(
    'rejects a payload missing %s',
    (field) => {
      const body: Record<string, unknown> = { ...minimalCreateBody };
      delete body[field];
      expect(decode(createSLOParamsSchema, { body }).success).toBe(false);
    }
  );

  it('rejects an invalid time window duration', () => {
    expect(
      decode(createSLOParamsSchema, {
        body: { ...minimalCreateBody, timeWindow: { duration: '0d', type: 'rolling' } },
      }).success
    ).toBe(false);
  });

  it('rejects an invalid custom id', () => {
    expect(
      decode(createSLOParamsSchema, { body: { ...minimalCreateBody, id: 'UPPERCASE' } }).success
    ).toBe(false);
  });

  it('rejects a non numeric objective target', () => {
    expect(
      decode(createSLOParamsSchema, {
        body: { ...minimalCreateBody, objective: { target: 'high' } },
      }).success
    ).toBe(false);
  });
});

describe('createSLOResponseSchema', () => {
  it('encodes the created id', () => {
    expect(encode(createSLOResponseSchema, { id: VALID_ID })).toEqual({ id: VALID_ID });
  });
});

describe('updateSLOParamsSchema', () => {
  it('accepts an empty body', () => {
    expect(decode(updateSLOParamsSchema, { path: { id: VALID_ID }, body: {} }).success).toBe(true);
  });

  it('accepts a partial body and decodes durations', () => {
    const result = decode(updateSLOParamsSchema, {
      path: { id: VALID_ID },
      body: { name: 'new name', timeWindow: { duration: '7d', type: 'rolling' } },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.body.name).toBe('new name');
      expect(result.value.body.timeWindow?.duration).toBeInstanceOf(Duration);
    }
  });

  it('rejects an invalid path id', () => {
    expect(decode(updateSLOParamsSchema, { path: { id: 'short' }, body: {} }).success).toBe(false);
  });
});

describe('updateSLOResponseSchema', () => {
  it('encodes a domain SLO back to its wire form', () => {
    expect(encode(updateSLOResponseSchema, buildDomainSLO())).toEqual(buildWireSLO());
  });
});

describe('getSLOParamsSchema', () => {
  it('accepts a path id without query', () => {
    expect(decode(getSLOParamsSchema, { path: { id: VALID_ID } }).success).toBe(true);
  });

  it('accepts instanceId and remoteName query parameters', () => {
    const result = decode(getSLOParamsSchema, {
      path: { id: VALID_ID },
      query: { instanceId: '*', remoteName: 'my-remote' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.query?.instanceId).toBe('*');
      expect(result.value.query?.remoteName).toBe('my-remote');
    }
  });

  it('rejects an invalid path id', () => {
    expect(decode(getSLOParamsSchema, { path: { id: 'short' } }).success).toBe(false);
  });
});

describe('getSLOResponseSchema', () => {
  it('encodes a domain SLO with summary back to its wire form', () => {
    const domain = buildDomainSLOWithData();
    expect(encode(getSLOResponseSchema, domain)).toEqual({
      ...buildWireSLO(),
      summary: domain.summary,
      groupings: domain.groupings,
      instanceId: domain.instanceId,
    });
  });
});

describe('findSLOParamsSchema', () => {
  it('accepts an empty request', () => {
    expect(decode(findSLOParamsSchema, {}).success).toBe(true);
  });

  it('keeps page, perPage and size as strings', () => {
    const result = decode(findSLOParamsSchema, {
      query: { page: '2', perPage: '25', size: '10' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.query?.page).toBe('2');
      expect(result.value.query?.perPage).toBe('25');
      expect(result.value.query?.size).toBe('10');
    }
  });

  it.each([
    ['true', true],
    ['false', false],
    [true, true],
  ])('decodes hideStale %p into %p', (input, expected) => {
    const result = decode(findSLOParamsSchema, { query: { hideStale: input } });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.query?.hideStale).toBe(expected);
    }
  });

  it('decodes a valid searchAfter JSON string into an array', () => {
    const result = decode(findSLOParamsSchema, {
      query: { searchAfter: JSON.stringify([1, 'ok']) },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.query?.searchAfter).toEqual([1, 'ok']);
    }
  });

  it.each(['not_an_array', 42, [], [42, 'ok']])('rejects invalid searchAfter %p', (searchAfter) => {
    expect(decode(findSLOParamsSchema, { query: { searchAfter } }).success).toBe(false);
  });

  it('accepts every documented sortBy value', () => {
    const sortByValues = [
      'error_budget_consumed',
      'error_budget_remaining',
      'sli_value',
      'status',
      'burn_rate_5m',
      'burn_rate_1h',
      'burn_rate_1d',
    ];
    for (const sortBy of sortByValues) {
      expect(decode(findSLOParamsSchema, { query: { sortBy } }).success).toBe(true);
    }
  });

  it('rejects an unknown sortBy value', () => {
    expect(decode(findSLOParamsSchema, { query: { sortBy: 'bogus' } }).success).toBe(false);
  });
});

describe('findSLOResponseSchema', () => {
  it('encodes results and keeps searchAfter as an array', () => {
    const domain = buildDomainSLOWithData();
    expect(
      encode(findSLOResponseSchema, {
        page: 1,
        perPage: 25,
        total: 1,
        results: [domain],
        searchAfter: ['cursor', 42],
        size: 10,
      })
    ).toEqual({
      page: 1,
      perPage: 25,
      total: 1,
      results: [
        {
          ...buildWireSLO(),
          summary: domain.summary,
          groupings: domain.groupings,
          instanceId: domain.instanceId,
        },
      ],
      searchAfter: ['cursor', 42],
      size: 10,
    });
  });
});

describe('deleteSLOParamsSchema', () => {
  it('accepts a valid path id', () => {
    expect(decode(deleteSLOParamsSchema, { path: { id: VALID_ID } }).success).toBe(true);
  });

  it('rejects an invalid path id', () => {
    expect(decode(deleteSLOParamsSchema, { path: { id: 'short' } }).success).toBe(false);
  });
});

describe('resetSLOParamsSchema', () => {
  it('accepts a valid path id', () => {
    expect(decode(resetSLOParamsSchema, { path: { id: VALID_ID } }).success).toBe(true);
  });

  it('rejects an invalid path id', () => {
    expect(decode(resetSLOParamsSchema, { path: { id: 'short' } }).success).toBe(false);
  });
});

describe('resetSLOResponseSchema', () => {
  it('encodes a domain SLO back to its wire form', () => {
    expect(encode(resetSLOResponseSchema, buildDomainSLO())).toEqual(buildWireSLO());
  });
});

describe('manageSLOParamsSchema', () => {
  it('accepts a valid path id', () => {
    expect(decode(manageSLOParamsSchema, { path: { id: VALID_ID } }).success).toBe(true);
  });

  it('rejects an invalid path id', () => {
    expect(decode(manageSLOParamsSchema, { path: { id: 'short' } }).success).toBe(false);
  });
});

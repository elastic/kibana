/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { Duration, DurationUnit } from '../models/duration';
import {
  compositeSloDefinitionSchema,
  compositeSloWithSummaryResponseSchema,
  storedCompositeSloDefinitionSchema,
} from './composite_slo';
import { compositeSloSummaryDocumentSchema } from './composite_slo_summary_index';

const CREATED_AT = '2024-01-01T00:00:00.000Z';
const UPDATED_AT = '2024-02-01T00:00:00.000Z';

const storedCompositeSlo = {
  id: 'composite-slo-id',
  name: 'My composite SLO',
  description: 'irrelevant',
  compositeMethod: 'weightedAverage',
  timeWindow: { duration: '30d', type: 'rolling' },
  budgetingMethod: 'occurrences',
  objective: { target: 0.99 },
  tags: ['production'],
  enabled: true,
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
  createdBy: 'elastic',
  updatedBy: 'elastic',
  version: 1,
  members: [
    { sloId: 'slo-id-1', weight: 1 },
    { sloId: 'slo-id-2', weight: 2, instanceId: 'host-1' },
  ],
};

const summary = {
  sliValue: 0.995,
  errorBudget: { initial: 0.01, consumed: 0.5, remaining: 0.5, isEstimated: false },
  status: 'HEALTHY',
  fiveMinuteBurnRate: 0.1,
  oneHourBurnRate: 0.2,
  oneDayBurnRate: 0.3,
};

describe('compositeSloDefinitionSchema', () => {
  it('decodes the time window duration into a Duration and the dates into Date instances', () => {
    const decoded = compositeSloDefinitionSchema.parse(storedCompositeSlo);

    expect(decoded.timeWindow.duration).toBeInstanceOf(Duration);
    expect(decoded.timeWindow.duration.isEqual(new Duration(30, DurationUnit.Day))).toBe(true);
    expect(decoded.createdAt).toEqual(new Date(CREATED_AT));
    expect(decoded.updatedAt).toEqual(new Date(UPDATED_AT));
  });

  it('rejects an invalid time window duration', () => {
    const result = compositeSloDefinitionSchema.safeParse({
      ...storedCompositeSlo,
      timeWindow: { duration: '30x', type: 'rolling' },
    });

    expect(result.success).toBe(false);
  });

  it('round-trips the stored form through decode and encode unchanged', () => {
    const decoded = compositeSloDefinitionSchema.parse(storedCompositeSlo);

    expect(z.encode(storedCompositeSloDefinitionSchema, decoded)).toEqual(storedCompositeSlo);
  });
});

describe('compositeSloWithSummaryResponseSchema', () => {
  it('encodes the domain form into wire strings', () => {
    const decoded = compositeSloDefinitionSchema.parse(storedCompositeSlo);

    const encoded = compositeSloWithSummaryResponseSchema.encode({
      ...decoded,
      summary: { ...summary, status: 'HEALTHY' },
      members: [],
    });

    expect(encoded.timeWindow.duration).toBe('30d');
    expect(encoded.createdAt).toBe(CREATED_AT);
    expect(encoded.updatedAt).toBe(UPDATED_AT);
  });
});

describe('compositeSloSummaryDocumentSchema', () => {
  it('encodes the embedded composite definition into wire strings', () => {
    const decoded = compositeSloDefinitionSchema.parse(storedCompositeSlo);

    const encoded = compositeSloSummaryDocumentSchema.encode({
      spaceId: 'default',
      summaryUpdatedAt: UPDATED_AT,
      compositeSlo: {
        id: decoded.id,
        name: decoded.name,
        description: decoded.description,
        tags: decoded.tags,
        objective: decoded.objective,
        timeWindow: decoded.timeWindow,
        budgetingMethod: decoded.budgetingMethod,
        createdAt: decoded.createdAt,
        updatedAt: decoded.updatedAt,
      },
      summary: { ...summary, status: 'HEALTHY' },
      unresolvedMemberIds: [],
    });

    expect(encoded.compositeSlo.timeWindow.duration).toBe('30d');
    expect(encoded.compositeSlo.createdAt).toBe(CREATED_AT);
    expect(encoded.compositeSlo.updatedAt).toBe(UPDATED_AT);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SingleCaseMetricsRequestSchema,
  CasesMetricsRequestSchema,
  SingleCaseMetricsResponseSchema,
  CasesMetricsResponseSchema,
  CaseMetricsFeature,
} from './v1';

describe('Metrics case', () => {
  describe('SingleCaseMetricsRequestSchema', () => {
    const defaultRequest = {
      features: [CaseMetricsFeature.ALERTS_COUNT, CaseMetricsFeature.LIFESPAN],
    };

    it('has expected attributes in request', () => {
      const result = SingleCaseMetricsRequestSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = SingleCaseMetricsRequestSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('does not accept invalid feature in request', () => {
      const result = SingleCaseMetricsRequestSchema.safeParse({
        features: [CaseMetricsFeature.MTTR],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('CasesMetricsRequestSchema', () => {
    const defaultRequest = {
      features: [CaseMetricsFeature.MTTR],
      to: 'now-1d',
      from: 'now-1d',
      owner: ['cases'],
    };

    it('has expected attributes in request', () => {
      const result = CasesMetricsRequestSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = CasesMetricsRequestSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from partial fields', () => {
      const partialRequest = { features: [CaseMetricsFeature.MTTR], foo: 'bar' };
      const result = CasesMetricsRequestSchema.safeParse(partialRequest);
      expect(result.success).toBe(true);
      expect(result.data).not.toHaveProperty('foo');
    });

    it('does not accept invalid feature in request', () => {
      const result = CasesMetricsRequestSchema.safeParse({
        features: ['foobar'],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SingleCaseMetricsResponseSchema', () => {
    const defaultRequest = {
      alerts: {
        count: 5,
        hosts: {
          total: 3,
          values: [
            { name: 'first-host', id: 'first-host-id', count: 3 },
            { id: 'second-host-id', count: 2 },
            { id: 'third-host-id', count: 3 },
          ],
        },
        users: {
          total: 2,
          values: [
            { name: 'first-user', count: 3 },
            { name: 'second-userd', count: 2 },
          ],
        },
      },
      connectors: { total: 1 },
      lifespan: {
        creationDate: new Date(0).toISOString(),
        closeDate: new Date(2).toISOString(),
        statusInfo: {
          inProgressDuration: 20,
          openDuration: 10,
          reopenDates: [new Date(1).toISOString()],
        },
      },
    };

    it('has expected attributes in request', () => {
      const result = SingleCaseMetricsResponseSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = SingleCaseMetricsResponseSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from alerts', () => {
      const result = SingleCaseMetricsResponseSchema.safeParse({
        ...defaultRequest,
        alerts: { ...defaultRequest.alerts, foo: 'bar' },
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from hosts', () => {
      const result = SingleCaseMetricsResponseSchema.safeParse({
        ...defaultRequest,
        alerts: {
          ...defaultRequest.alerts,
          hosts: { ...defaultRequest.alerts!.hosts, foo: 'bar' },
        },
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from users', () => {
      const result = SingleCaseMetricsResponseSchema.safeParse({
        ...defaultRequest,
        alerts: {
          ...defaultRequest.alerts,
          users: { ...defaultRequest.alerts!.users, foo: 'bar' },
        },
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from connectors', () => {
      const result = SingleCaseMetricsResponseSchema.safeParse({
        ...defaultRequest,
        connectors: { ...defaultRequest.connectors, foo: 'bar' },
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from lifespan', () => {
      const result = SingleCaseMetricsResponseSchema.safeParse({
        ...defaultRequest,
        lifespan: { ...defaultRequest.lifespan, foo: 'bar' },
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from status info', () => {
      const result = SingleCaseMetricsResponseSchema.safeParse({
        ...defaultRequest,
        lifespan: {
          ...defaultRequest.lifespan,
          statusInfo: { ...defaultRequest.lifespan!.statusInfo, foo: 'bar' },
        },
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('CasesMetricsResponseSchema', () => {
    const defaultRequest = { mttr: 1 };

    it('has expected attributes in request', () => {
      const result = CasesMetricsResponseSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = CasesMetricsResponseSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });
});

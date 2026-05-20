/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import {
  SingleCaseMetricsRequestRt,
  CasesMetricsRequestRt,
  SingleCaseMetricsResponseRt,
  CasesMetricsResponseRt,
  CaseMetricsFeature,
} from './v1';
import {
  SingleCaseMetricsRequestSchema,
  CasesMetricsRequestSchema,
  SingleCaseMetricsResponseSchema,
  CasesMetricsResponseSchema,
} from '../../api_zod/metrics/v1';

describe('Metrics case', () => {
  describe('SingleCaseMetricsRequestRt', () => {
    const defaultRequest = {
      features: [CaseMetricsFeature.ALERTS_COUNT, CaseMetricsFeature.LIFESPAN],
    };

    it('has expected attributes in request', () => {
      const query = SingleCaseMetricsRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = SingleCaseMetricsRequestRt.decode({
        ...defaultRequest,
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('zod: has expected attributes in request', () => {
      const result = SingleCaseMetricsRequestSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('zod: strips unknown fields', () => {
      const result = SingleCaseMetricsRequestSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    describe('errors', () => {
      it('has invalid feature in request', () => {
        expect(
          PathReporter.report(
            SingleCaseMetricsRequestRt.decode({
              features: [CaseMetricsFeature.MTTR],
            })
          )[0]
        ).toContain('Invalid value "mttr" supplied');
      });
    });
  });

  describe('CasesMetricsRequestRt', () => {
    const defaultRequest = {
      features: [CaseMetricsFeature.MTTR],
      to: 'now-1d',
      from: 'now-1d',
      owner: ['cases'],
    };

    it('has expected attributes in request', () => {
      const query = CasesMetricsRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CasesMetricsRequestRt.decode({
        ...defaultRequest,
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from when partial fields', () => {
      const query = CasesMetricsRequestRt.decode({
        features: [CaseMetricsFeature.MTTR],
        to: 'now-1d',
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          features: [CaseMetricsFeature.MTTR],
          to: 'now-1d',
        },
      });
    });
    it('zod: has expected attributes in request', () => {
      const result = CasesMetricsRequestSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('zod: strips unknown fields', () => {
      const result = CasesMetricsRequestSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    describe('errors', () => {
      it('has invalid feature in request', () => {
        expect(
          PathReporter.report(
            CasesMetricsRequestRt.decode({
              features: ['foobar'],
            })
          )[0]
        ).toContain('Invalid value "foobar" supplied');
      });
    });
  });

  describe('SingleCaseMetricsResponseRt', () => {
    const defaultRequest = {
      alerts: {
        count: 5,
        hosts: {
          total: 3,
          values: [
            { name: 'first-host', id: 'first-host-id', count: 3 },
            { id: 'second-host-id', count: 2, name: undefined },
            { id: 'third-host-id', count: 3, name: undefined },
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
      actions: {
        isolateHost: {
          isolate: { total: 1 },
          unisolate: { total: 2 },
        },
      },
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
      const query = SingleCaseMetricsResponseRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = SingleCaseMetricsResponseRt.decode({
        ...defaultRequest,
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from alerts', () => {
      const query = SingleCaseMetricsResponseRt.decode({
        ...defaultRequest,
        alerts: { ...defaultRequest.alerts, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from hosts', () => {
      const query = SingleCaseMetricsResponseRt.decode({
        ...defaultRequest,
        alerts: { ...defaultRequest.alerts, hosts: { ...defaultRequest.alerts.hosts, foo: 'bar' } },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from users', () => {
      const query = SingleCaseMetricsResponseRt.decode({
        ...defaultRequest,
        alerts: { ...defaultRequest.alerts, users: { ...defaultRequest.alerts.users, foo: 'bar' } },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from connectors', () => {
      const query = SingleCaseMetricsResponseRt.decode({
        ...defaultRequest,
        connectors: { total: 1, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from actions', () => {
      const query = SingleCaseMetricsResponseRt.decode({
        ...defaultRequest,
        actions: { ...defaultRequest.actions, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from isolate hosts', () => {
      const query = SingleCaseMetricsResponseRt.decode({
        ...defaultRequest,
        actions: {
          ...defaultRequest.actions,
          isolateHost: { ...defaultRequest.actions.isolateHost, foo: 'bar' },
        },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from unisolate host', () => {
      const query = SingleCaseMetricsResponseRt.decode({
        ...defaultRequest,
        actions: {
          ...defaultRequest.actions,
          isolateHost: {
            ...defaultRequest.actions.isolateHost,
            unisolate: { foo: 'bar', total: 2 },
          },
        },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from lifespan', () => {
      const query = SingleCaseMetricsResponseRt.decode({
        ...defaultRequest,
        lifespan: { ...defaultRequest.lifespan, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from status info', () => {
      const query = SingleCaseMetricsResponseRt.decode({
        ...defaultRequest,
        lifespan: {
          ...defaultRequest.lifespan,
          statusInfo: { foo: 'bar', ...defaultRequest.lifespan.statusInfo },
        },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('zod: has expected attributes in request', () => {
      // Zod strips keys with undefined values, so omit name: undefined from host values
      const zodRequest = {
        ...defaultRequest,
        alerts: {
          ...defaultRequest.alerts,
          hosts: {
            ...defaultRequest.alerts.hosts,
            values: [
              { name: 'first-host', id: 'first-host-id', count: 3 },
              { id: 'second-host-id', count: 2 },
              { id: 'third-host-id', count: 3 },
            ],
          },
        },
      };
      const result = SingleCaseMetricsResponseSchema.safeParse(zodRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(zodRequest);
    });

    it('zod: strips unknown fields', () => {
      const zodRequest = {
        ...defaultRequest,
        alerts: {
          ...defaultRequest.alerts,
          hosts: {
            ...defaultRequest.alerts.hosts,
            values: [
              { name: 'first-host', id: 'first-host-id', count: 3 },
              { id: 'second-host-id', count: 2 },
              { id: 'third-host-id', count: 3 },
            ],
          },
        },
      };
      const result = SingleCaseMetricsResponseSchema.safeParse({ ...zodRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(zodRequest);
    });
  });

  describe('CasesMetricsResponseRt', () => {
    const defaultRequest = { mttr: 1 };

    it('has expected attributes in request', () => {
      const query = CasesMetricsResponseRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CasesMetricsResponseRt.decode({
        mttr: null,
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          mttr: null,
        },
      });
    });

    it('zod: has expected attributes in request', () => {
      const result = CasesMetricsResponseSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('zod: strips unknown fields', () => {
      const result = CasesMetricsResponseSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRoutingForkRequestPayload, routingConverter } from './utils';
import type { RoutingDefinition } from '@kbn/streams-schema';

describe('utils', () => {
  describe('buildRoutingForkRequestPayload', () => {
    const baseRule: RoutingDefinition = {
      destination: 'logs.child',
      where: { field: 'log.level', eq: 'error' },
      status: 'enabled',
    };

    it('should build payload without draft flag when not specified', () => {
      const payload = buildRoutingForkRequestPayload(baseRule);

      expect(payload).toEqual({
        where: baseRule.where,
        status: 'enabled',
        stream: {
          name: 'logs.child',
        },
      });
      expect(payload).not.toHaveProperty('draft');
    });

    it('should build payload without draft flag when options is undefined', () => {
      const payload = buildRoutingForkRequestPayload(baseRule, undefined);

      expect(payload).not.toHaveProperty('draft');
    });

    it('should build payload without draft flag when draft is false', () => {
      const payload = buildRoutingForkRequestPayload(baseRule, { draft: false });

      expect(payload).not.toHaveProperty('draft');
    });

    it('should build payload with draft flag when draft is true', () => {
      const payload = buildRoutingForkRequestPayload(baseRule, { draft: true });

      expect(payload).toEqual({
        where: baseRule.where,
        status: 'enabled',
        stream: {
          name: 'logs.child',
        },
        draft: true,
      });
    });

    it('should include the routing status from the rule', () => {
      const disabledRule: RoutingDefinition = {
        ...baseRule,
        status: 'disabled',
      };

      const payload = buildRoutingForkRequestPayload(disabledRule);

      expect(payload.status).toBe('disabled');
    });
  });

  describe('routingConverter', () => {
    describe('toUIDefinition', () => {
      it('should add id and default status to routing definition', () => {
        const rule: RoutingDefinition = {
          destination: 'logs.child',
          where: { always: {} },
        };

        const uiDefinition = routingConverter.toUIDefinition(rule);

        expect(uiDefinition).toHaveProperty('id');
        expect(uiDefinition.status).toBe('enabled');
        expect(uiDefinition.destination).toBe('logs.child');
        expect(uiDefinition.where).toEqual({ always: {} });
      });

      it('should preserve existing status', () => {
        const rule: RoutingDefinition = {
          destination: 'logs.child',
          where: { always: {} },
          status: 'disabled',
        };

        const uiDefinition = routingConverter.toUIDefinition(rule);

        expect(uiDefinition.status).toBe('disabled');
      });
    });

    describe('toAPIDefinition', () => {
      it('should remove id from UI definition', () => {
        const uiDefinition = {
          id: 'generated-id-123',
          destination: 'logs.child',
          where: { always: {} } as const,
          status: 'enabled' as const,
        };

        const apiDefinition = routingConverter.toAPIDefinition(uiDefinition);

        expect(apiDefinition).not.toHaveProperty('id');
        expect(apiDefinition.destination).toBe('logs.child');
        expect(apiDefinition.where).toEqual({ always: {} });
        expect(apiDefinition.status).toBe('enabled');
      });
    });
  });
});

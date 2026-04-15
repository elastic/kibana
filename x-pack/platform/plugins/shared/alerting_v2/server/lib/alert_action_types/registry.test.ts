/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { alertActionTypeDefinitions, defineAlertActionType } from '@kbn/alerting-v2-alert-actions';
import { AlertActionTypeRegistry } from './registry';

describe('AlertActionTypeRegistry', () => {
  describe('getRouteDefinitions', () => {
    it('creates a route definition for each registered definition', () => {
      const registry = new AlertActionTypeRegistry(alertActionTypeDefinitions);
      const routes = registry.getRouteDefinitions();
      expect(routes).toHaveLength(alertActionTypeDefinitions.length);
    });

    it('creates route definitions with correct static metadata', () => {
      const testDef = defineAlertActionType({
        id: 'test_action',
        description: 'A test action.',
        bodySchema: z.object({ value: z.string() }),
      });

      const registry = new AlertActionTypeRegistry([testDef]);
      const routes = registry.getRouteDefinitions();

      expect(routes).toHaveLength(1);
      expect(routes[0].method).toBe('post');
      expect(routes[0].path).toContain('/action/_test_action');
    });

    it('uses custom pathSuffix when provided', () => {
      const testDef = defineAlertActionType({
        id: 'my_action',
        pathSuffix: '_custom_suffix',
        description: 'Custom suffix.',
        bodySchema: z.object({}),
      });

      const registry = new AlertActionTypeRegistry([testDef]);
      const routes = registry.getRouteDefinitions();

      expect(routes[0].path).toContain('/action/_custom_suffix');
    });
  });

  describe('getComposedMappings', () => {
    it('includes base mappings', () => {
      const registry = new AlertActionTypeRegistry([]);
      const { properties } = registry.getComposedMappings();

      expect(properties).toHaveProperty('@timestamp');
      expect(properties).toHaveProperty('actor');
      expect(properties).toHaveProperty('action_type');
      expect(properties).toHaveProperty('group_hash');
      expect(properties).toHaveProperty('rule_id');
      expect(properties).toHaveProperty('space_id');
    });

    it('merges action-specific mappings from definitions', () => {
      const testDef = defineAlertActionType({
        id: 'custom',
        description: 'Custom.',
        bodySchema: z.object({ custom_field: z.string() }),
        esMappings: { custom_field: { type: 'keyword' } },
      });

      const registry = new AlertActionTypeRegistry([testDef]);
      const { properties } = registry.getComposedMappings();

      expect(properties).toHaveProperty('custom_field');
      expect(properties.custom_field).toEqual({ type: 'keyword' });
      expect(properties).toHaveProperty('@timestamp');
    });

    it('produces the same mappings as the original hardcoded definition', () => {
      const registry = new AlertActionTypeRegistry(alertActionTypeDefinitions);
      const { properties } = registry.getComposedMappings();

      expect(properties).toHaveProperty('@timestamp', { type: 'date' });
      expect(properties).toHaveProperty('last_series_event_timestamp', { type: 'date' });
      expect(properties).toHaveProperty('expiry', { type: 'date' });
      expect(properties).toHaveProperty('actor', { type: 'keyword' });
      expect(properties).toHaveProperty('action_type', { type: 'keyword' });
      expect(properties).toHaveProperty('group_hash', { type: 'keyword' });
      expect(properties).toHaveProperty('episode_id', { type: 'keyword' });
      expect(properties).toHaveProperty('episode_status', { type: 'keyword' });
      expect(properties).toHaveProperty('rule_id', { type: 'keyword' });
      expect(properties).toHaveProperty('tags', { type: 'keyword' });
      expect(properties).toHaveProperty('notification_group_id', { type: 'keyword' });
      expect(properties).toHaveProperty('source', { type: 'keyword' });
      expect(properties).toHaveProperty('reason', { type: 'text' });
      expect(properties).toHaveProperty('space_id', { type: 'keyword' });
    });

    it('sets dynamic to false', () => {
      const registry = new AlertActionTypeRegistry(alertActionTypeDefinitions);
      const mappings = registry.getComposedMappings();
      expect(mappings.dynamic).toBe(false);
    });
  });

  describe('validation', () => {
    it('throws on duplicate action type ids', () => {
      const def = defineAlertActionType({
        id: 'dup',
        description: 'Duplicate.',
        bodySchema: z.object({}),
      });

      expect(() => new AlertActionTypeRegistry([def, def])).toThrow(
        "Duplicate alert action type id: 'dup'."
      );
    });

    it('throws when an action defines an ES mapping for a reserved base field', () => {
      const def = defineAlertActionType({
        id: 'bad_action',
        description: 'Bad.',
        bodySchema: z.object({ rule_id: z.string() }),
        esMappings: { rule_id: { type: 'text' } },
      });

      expect(() => new AlertActionTypeRegistry([def])).toThrow(
        "Action 'bad_action' defines ES mapping for 'rule_id' which is a reserved base field."
      );
    });

    it('throws when two actions define the same ES mapping field with different types', () => {
      const defA = defineAlertActionType({
        id: 'action_a',
        description: 'A.',
        bodySchema: z.object({ shared: z.string() }),
        esMappings: { shared: { type: 'keyword' } },
      });

      const defB = defineAlertActionType({
        id: 'action_b',
        description: 'B.',
        bodySchema: z.object({ shared: z.string() }),
        esMappings: { shared: { type: 'text' } },
      });

      expect(() => new AlertActionTypeRegistry([defA, defB])).toThrow(
        "Action 'action_b' defines ES mapping for 'shared'"
      );
    });

    it('allows two actions to define the same ES mapping field with identical types', () => {
      const defA = defineAlertActionType({
        id: 'action_a',
        description: 'A.',
        bodySchema: z.object({ shared: z.string() }),
        esMappings: { shared: { type: 'keyword' } },
      });

      const defB = defineAlertActionType({
        id: 'action_b',
        description: 'B.',
        bodySchema: z.object({ shared: z.string() }),
        esMappings: { shared: { type: 'keyword' } },
      });

      expect(() => new AlertActionTypeRegistry([defA, defB])).not.toThrow();
    });
  });
});

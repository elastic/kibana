/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  migrateWhereBlocksToCondition,
  migrateOldProcessingArrayToStreamlang,
  migrateRoutingIfConditionToStreamlang,
} from './migrate_to_streamlang_on_read';

/**
 * Helper to extract routing from migrated definition
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getRoutingFromMigrated(result: any) {
  return result.ingest.wired.routing;
}

describe('migrate_to_streamlang_on_read', () => {
  describe('migrateWhereBlocksToCondition', () => {
    it('should migrate where blocks to use condition property', () => {
      const steps = [
        {
          where: {
            field: 'status',
            eq: 'active',
            steps: [{ action: 'set', to: 'flag', value: 'yes' }],
          },
        },
      ];

      const result = migrateWhereBlocksToCondition(steps);

      expect(result.migrated).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const step: any = result.steps[0];
      expect(step).toHaveProperty('condition');
      expect(step).not.toHaveProperty('where');
      expect(step.condition).toHaveProperty('field', 'status');
      expect(step.condition.steps).toHaveLength(1);
    });

    it('should migrate nested where blocks recursively', () => {
      const steps = [
        {
          where: {
            field: 'level1',
            eq: 'value1',
            steps: [
              { action: 'set', to: 'field1', value: 'value1' },
              {
                where: {
                  field: 'level2',
                  eq: 'value2',
                  steps: [{ action: 'set', to: 'field2', value: 'value2' }],
                },
              },
            ],
          },
        },
      ];

      const result = migrateWhereBlocksToCondition(steps);

      expect(result.migrated).toBe(true);

      // Check outer where block migrated
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const outerStep: any = result.steps[0];
      expect(outerStep).toHaveProperty('condition');
      expect(outerStep).not.toHaveProperty('where');

      // Check nested where block also migrated
      const nestedStep = outerStep.condition.steps[1];
      expect(nestedStep).toHaveProperty('condition');
      expect(nestedStep).not.toHaveProperty('where');
      expect(nestedStep.condition.steps).toHaveLength(1);
    });

    it('should not migrate action steps with where clauses', () => {
      const steps = [
        {
          action: 'set',
          to: 'flag',
          value: 'yes',
          where: { field: 'status', eq: 'active' },
        },
      ];

      const result = migrateWhereBlocksToCondition(steps);

      // Action step where clause should remain unchanged
      expect(result.migrated).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const step: any = result.steps[0];
      expect(step).toHaveProperty('where');
      expect(step).not.toHaveProperty('condition');
      expect(step.action).toBe('set');
    });

    it('should handle mixed where blocks and action steps with where clauses', () => {
      const steps = [
        {
          action: 'set',
          to: 'field1',
          value: 'value1',
          where: { field: 'status', eq: 'active' },
        },
        {
          where: {
            field: 'env',
            eq: 'prod',
            steps: [{ action: 'set', to: 'field2', value: 'value2' }],
          },
        },
      ];

      const result = migrateWhereBlocksToCondition(steps);

      expect(result.migrated).toBe(true);

      // First step: action with where clause should remain unchanged
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const firstStep: any = result.steps[0];
      expect(firstStep).toHaveProperty('where');
      expect(firstStep).not.toHaveProperty('condition');
      expect(firstStep.action).toBe('set');

      // Second step: where block should be migrated to condition
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const secondStep: any = result.steps[1];
      expect(secondStep).toHaveProperty('condition');
      expect(secondStep).not.toHaveProperty('where');
      expect(secondStep.condition.steps).toHaveLength(1);
    });

    it('should handle empty steps array', () => {
      const steps: unknown[] = [];

      const result = migrateWhereBlocksToCondition(steps);

      expect(result.migrated).toBe(false);
      expect(result.steps).toEqual([]);
    });

    it('should handle deeply nested where blocks', () => {
      const steps = [
        {
          where: {
            field: 'level1',
            eq: 'val1',
            steps: [
              {
                where: {
                  field: 'level2',
                  eq: 'val2',
                  steps: [
                    {
                      where: {
                        field: 'level3',
                        eq: 'val3',
                        steps: [{ action: 'set', to: 'deep', value: 'yes' }],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ];

      const result = migrateWhereBlocksToCondition(steps);

      expect(result.migrated).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const level1: any = result.steps[0];
      expect(level1).toHaveProperty('condition');

      const level2 = level1.condition.steps[0];
      expect(level2).toHaveProperty('condition');

      const level3 = level2.condition.steps[0];
      expect(level3).toHaveProperty('condition');

      const action = level3.condition.steps[0];
      expect(action.action).toBe('set');
    });

    it('should handle where blocks with complex conditions', () => {
      const steps = [
        {
          where: {
            and: [
              { field: 'status', eq: 'active' },
              { field: 'env', eq: 'prod' },
            ],
            steps: [{ action: 'set', to: 'flag', value: 'yes' }],
          },
        },
      ];

      const result = migrateWhereBlocksToCondition(steps);

      expect(result.migrated).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const step: any = result.steps[0];

      expect(step.condition).toHaveProperty('and');
      expect(step.condition.and).toEqual([
        { field: 'status', eq: 'active' },
        { field: 'env', eq: 'prod' },
      ]);
      expect(step.condition.steps).toHaveLength(1);
    });
  });

  describe('migrateOldProcessingArrayToStreamlang', () => {
    it('should migrate old flat processing array to Streamlang DSL', () => {
      const definition = {
        name: 'test-stream',
        ingest: {
          processing: [
            {
              grok: {
                field: 'message',
                patterns: ['%{IP:client} %{WORD:method}'],
              },
            },
          ],
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = migrateOldProcessingArrayToStreamlang(definition);

      expect(result.ingest.processing).toHaveProperty('steps');
      expect(Array.isArray(result.ingest.processing.steps)).toBe(true);
    });

    it('should wrap old processors in manual_ingest_pipeline', () => {
      const definition = {
        name: 'test-stream',
        ingest: {
          processing: [
            {
              grok: {
                field: 'message',
                patterns: ['%{IP:client}'],
              },
            },
            {
              set: {
                field: 'flag',
                value: 'processed',
              },
            },
          ],
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = migrateOldProcessingArrayToStreamlang(definition);

      const steps = result.ingest.processing.steps;
      expect(steps).toHaveLength(1);
      expect(steps[0].action).toBe('manual_ingest_pipeline');
      expect(steps[0].processors).toHaveLength(2);
      expect(steps[0].processors[0]).toHaveProperty('grok');
      expect(steps[0].processors[1]).toHaveProperty('set');
    });

    it('should convert manual_ingest_pipeline processors to Streamlang format', () => {
      const definition = {
        name: 'test-stream',
        ingest: {
          processing: [
            {
              manual_ingest_pipeline: {
                processors: [
                  {
                    grok: {
                      field: 'message',
                      patterns: ['%{IP:client}'],
                    },
                  },
                ],
                description: 'Test pipeline',
                if: {
                  field: 'status',
                  operator: 'eq',
                  value: 'active',
                },
              },
            },
          ],
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = migrateOldProcessingArrayToStreamlang(definition);

      const steps = result.ingest.processing.steps;
      expect(steps).toHaveLength(1);
      expect(steps[0].action).toBe('manual_ingest_pipeline');
      expect(steps[0].description).toBe('Test pipeline');
      expect(steps[0].where).toHaveProperty('field', 'status');
      expect(steps[0].where).toHaveProperty('eq', 'active');
    });

    it('should handle processing array with mixed processor types', () => {
      const definition = {
        name: 'test-stream',
        ingest: {
          processing: [
            {
              manual_ingest_pipeline: {
                processors: [{ grok: { field: 'message', patterns: ['%{IP:client}'] } }],
                if: { always: {} },
              },
            },
            {
              set: {
                field: 'flag',
                value: 'yes',
              },
            },
          ],
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = migrateOldProcessingArrayToStreamlang(definition);

      const steps = result.ingest.processing.steps;
      expect(steps).toHaveLength(2);
      expect(steps[0].action).toBe('manual_ingest_pipeline');
      expect(steps[1].action).toBe('manual_ingest_pipeline');
      expect(steps[1].processors[0]).toHaveProperty('set');
    });

    it('should handle empty processing array', () => {
      const definition = {
        name: 'test-stream',
        ingest: {
          processing: [],
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = migrateOldProcessingArrayToStreamlang(definition);

      const steps = result.ingest.processing.steps;
      expect(steps).toEqual([]);
    });

    it('should preserve ignore_failure flag', () => {
      const definition = {
        name: 'test-stream',
        ingest: {
          processing: [
            {
              manual_ingest_pipeline: {
                processors: [{ grok: { field: 'message', patterns: ['%{IP:client}'] } }],
                ignore_failure: true,
                if: { always: {} },
              },
            },
          ],
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = migrateOldProcessingArrayToStreamlang(definition);

      const steps = result.ingest.processing.steps;
      expect(steps[0].ignore_failure).toBe(true);
    });
  });

  describe('migrateRoutingIfConditionToStreamlang', () => {
    it('should migrate routing "if" conditions to "where"', () => {
      const definition = {
        name: 'test-stream',
        ingest: {
          wired: {
            routing: [
              {
                destination: 'test.child',
                if: {
                  field: 'status',
                  operator: 'eq',
                  value: 'active',
                },
              },
            ],
          },
        },
      };

      const result = migrateRoutingIfConditionToStreamlang(definition);

      const routing = getRoutingFromMigrated(result);
      expect(routing[0]).not.toHaveProperty('if');
      expect(routing[0]).toHaveProperty('where');
      expect(routing[0].where).toHaveProperty('field', 'status');
      expect(routing[0].where).toHaveProperty('eq', 'active');
    });

    it('should convert exists operator correctly', () => {
      const definition = {
        name: 'test-stream',
        ingest: {
          wired: {
            routing: [
              {
                destination: 'test.child',
                if: {
                  field: 'user.email',
                  operator: 'exists',
                },
              },
            ],
          },
        },
      };

      const result = migrateRoutingIfConditionToStreamlang(definition);

      const routing = getRoutingFromMigrated(result);
      expect(routing[0].where).toHaveProperty('field', 'user.email');
      expect(routing[0].where).toHaveProperty('exists', true);
    });

    it('should convert notExists operator correctly', () => {
      const definition = {
        name: 'test-stream',
        ingest: {
          wired: {
            routing: [
              {
                destination: 'test.child',
                if: {
                  field: 'error.message',
                  operator: 'notExists',
                },
              },
            ],
          },
        },
      };

      const result = migrateRoutingIfConditionToStreamlang(definition);

      const routing = getRoutingFromMigrated(result);
      expect(routing[0].where).toHaveProperty('field', 'error.message');
      expect(routing[0].where).toHaveProperty('exists', false);
    });

    it('should migrate complex AND conditions', () => {
      const definition = {
        name: 'test-stream',
        ingest: {
          wired: {
            routing: [
              {
                destination: 'test.child',
                if: {
                  and: [
                    { field: 'status', operator: 'eq', value: 'active' },
                    { field: 'env', operator: 'eq', value: 'prod' },
                  ],
                },
              },
            ],
          },
        },
      };

      const result = migrateRoutingIfConditionToStreamlang(definition);

      const routing = getRoutingFromMigrated(result);
      expect(routing[0].where).toHaveProperty('and');
      expect(routing[0].where.and).toHaveLength(2);
      expect(routing[0].where.and[0]).toHaveProperty('eq', 'active');
      expect(routing[0].where.and[1]).toHaveProperty('eq', 'prod');
    });

    it('should migrate complex OR conditions', () => {
      const definition = {
        name: 'test-stream',
        ingest: {
          wired: {
            routing: [
              {
                destination: 'test.child',
                if: {
                  or: [
                    { field: 'level', operator: 'eq', value: 'error' },
                    { field: 'level', operator: 'eq', value: 'critical' },
                  ],
                },
              },
            ],
          },
        },
      };

      const result = migrateRoutingIfConditionToStreamlang(definition);

      const routing = getRoutingFromMigrated(result);
      expect(routing[0].where).toHaveProperty('or');
      expect(routing[0].where.or).toHaveLength(2);
      expect(routing[0].where.or[0]).toHaveProperty('eq', 'error');
      expect(routing[0].where.or[1]).toHaveProperty('eq', 'critical');
    });

    it('should handle always condition', () => {
      const definition = {
        name: 'test-stream',
        ingest: {
          wired: {
            routing: [
              {
                destination: 'test.child',
                if: { always: {} },
              },
            ],
          },
        },
      };

      const result = migrateRoutingIfConditionToStreamlang(definition);

      const routing = getRoutingFromMigrated(result);
      expect(routing[0].where).toEqual({ always: {} });
    });

    it('should handle never condition', () => {
      const definition = {
        name: 'test-stream',
        ingest: {
          wired: {
            routing: [
              {
                destination: 'test.child',
                if: { never: {} },
              },
            ],
          },
        },
      };

      const result = migrateRoutingIfConditionToStreamlang(definition);

      const routing = getRoutingFromMigrated(result);
      expect(routing[0].where).toEqual({ never: {} });
    });

    it('should migrate multiple routing rules', () => {
      const definition = {
        name: 'test-stream',
        ingest: {
          wired: {
            routing: [
              {
                destination: 'test.child1',
                if: { field: 'status', operator: 'eq', value: 'active' },
              },
              {
                destination: 'test.child2',
                if: { field: 'env', operator: 'eq', value: 'prod' },
              },
            ],
          },
        },
      };

      const result = migrateRoutingIfConditionToStreamlang(definition);

      const routing = getRoutingFromMigrated(result);
      expect(routing).toHaveLength(2);
      expect(routing[0].where).toHaveProperty('field', 'status');
      expect(routing[1].where).toHaveProperty('field', 'env');
    });

    it('should preserve other routing properties', () => {
      const definition = {
        name: 'test-stream',
        ingest: {
          wired: {
            routing: [
              {
                destination: 'test.child',
                status: 'enabled',
                if: { field: 'status', operator: 'eq', value: 'active' },
              },
            ],
          },
        },
      };

      const result = migrateRoutingIfConditionToStreamlang(definition);

      const routing = getRoutingFromMigrated(result);
      expect(routing[0].destination).toBe('test.child');
      expect(routing[0].status).toBe('enabled');
      expect(routing[0]).toHaveProperty('where');
    });
  });
});

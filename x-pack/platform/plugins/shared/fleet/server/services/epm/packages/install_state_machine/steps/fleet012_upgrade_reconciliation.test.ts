/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse, stringify } from 'yaml';

describe('FLEET-012: upgrade reconciliation', () => {
  describe('preserve user-disabled state', () => {
    it('does not re-enable a workflow the user disabled', () => {
      const existingYaml = stringify({ enabled: false, steps: [] });
      const existingParsed = parse(existingYaml) as { enabled?: boolean };

      const newDefinition = { enabled: true, steps: [] };

      // Simulate the preservation logic
      if (existingParsed.enabled === false && newDefinition.enabled !== false) {
        newDefinition.enabled = false;
      }

      expect(newDefinition.enabled).toBe(false);
    });

    it('re-enables if the user did not disable it', () => {
      const existingYaml = stringify({ enabled: true, steps: [] });
      const existingParsed = parse(existingYaml) as { enabled?: boolean };

      const newDefinition = { enabled: true, steps: [] };

      if (existingParsed.enabled === false && newDefinition.enabled !== false) {
        newDefinition.enabled = false;
      }

      expect(newDefinition.enabled).toBe(true);
    });

    it('preserves disabled state when manifest default is undefined', () => {
      const existingYaml = stringify({ enabled: false, steps: [] });
      const existingParsed = parse(existingYaml) as { enabled?: boolean };

      // When default_enabled is undefined, workflowDefinition.enabled is unset
      const newDefinition = { steps: [] } as { enabled?: boolean };

      if (existingParsed.enabled === false && newDefinition.enabled !== false) {
        newDefinition.enabled = false;
      }

      expect(newDefinition.enabled).toBe(false);
    });
  });

  describe('orphaned workflow detection', () => {
    it('identifies workflows not in the new asset set', () => {
      const newAssetIds = new Set([
        'fleet-default-test-pkg-workflow-a',
        'fleet-default-test-pkg-workflow-b',
      ]);

      const allWorkflows = [
        { id: 'fleet-default-test-pkg-workflow-a', managed: true, managedBy: 'test-pkg' },
        { id: 'fleet-default-test-pkg-workflow-b', managed: true, managedBy: 'test-pkg' },
        { id: 'fleet-default-test-pkg-workflow-c', managed: true, managedBy: 'test-pkg' },
        { id: 'fleet-default-other-pkg-workflow-x', managed: true, managedBy: 'other-pkg' },
        { id: 'fleet-default-test-pkg-manual-workflow', managed: false, managedBy: undefined },
      ];

      const prefix = 'fleet-default-test-pkg-';
      const orphans = allWorkflows.filter(
        (wf) =>
          wf.id.startsWith(prefix) &&
          !newAssetIds.has(wf.id) &&
          wf.managed === true &&
          wf.managedBy === 'test-pkg'
      );

      expect(orphans).toHaveLength(1);
      expect(orphans[0].id).toBe('fleet-default-test-pkg-workflow-c');
    });

    it('does not remove workflows from other packages', () => {
      const newAssetIds = new Set(['fleet-default-test-pkg-workflow-a']);
      const prefix = 'fleet-default-test-pkg-';
      const allWorkflows = [
        { id: 'fleet-default-test-pkg-workflow-a', managed: true, managedBy: 'test-pkg' },
        { id: 'fleet-default-other-pkg-workflow-b', managed: true, managedBy: 'other-pkg' },
      ];

      const orphans = allWorkflows.filter(
        (wf) =>
          wf.id.startsWith(prefix) &&
          !newAssetIds.has(wf.id) &&
          wf.managed === true &&
          wf.managedBy === 'test-pkg'
      );

      expect(orphans).toHaveLength(0);
    });

    it('does not remove unmanaged workflows', () => {
      const newAssetIds = new Set<string>();
      const prefix = 'fleet-default-test-pkg-';
      const allWorkflows = [
        { id: 'fleet-default-test-pkg-custom', managed: false, managedBy: undefined },
      ];

      const orphans = allWorkflows.filter(
        (wf) =>
          wf.id.startsWith(prefix) &&
          !newAssetIds.has(wf.id) &&
          wf.managed === true &&
          wf.managedBy === 'test-pkg'
      );

      expect(orphans).toHaveLength(0);
    });
  });
});

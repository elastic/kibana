/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaRegistry } from '@elastic/schemas/kibana/tools/index.js';
import { getKibanaConnectors } from '@kbn/workflows';
import { getStepRisk, getWorkflowSteps, KIBANA_STEP_APIS } from './step_risk';

const normalizePath = (path: string): string => path.replace(/\{[^}]+\}/g, '{}');

describe('getStepRisk', () => {
  it.each([
    ['console', { safe: true, destructive: false }],
    ['waitForInput', { safe: true, destructive: false }],
    ['workflow.execute', { safe: false, destructive: false }],
    ['cases.getCase', { safe: true, destructive: false }],
    ['cases.deleteCases', { safe: false, destructive: true }],
    ['http', { safe: false, destructive: false }],
    ['elasticsearch.request', { safe: false, destructive: false }],
  ])('classifies %s', (stepType, expected) => {
    expect(getStepRisk(stepType)).toEqual(expected);
  });

  it.each([
    ['elasticsearch.search', true, false, 'search'],
    ['elasticsearch.indices.create', true, false, 'indices.create'],
    ['elasticsearch.indices.delete', false, true, 'indices.delete'],
    ['elasticsearch.index', false, true, 'index'],
  ])('uses the execute_api registry flag for %s', (stepType, safe, destructive, api) => {
    expect(getStepRisk(stepType)).toEqual({
      safe,
      destructive,
      api: { target: 'elasticsearch', api },
    });
  });

  it.each([
    ['kibana.getCase', true, 'cases.get-case'],
    ['kibana.streams.list', true, 'streams.get-streams'],
    ['kibana.SetAlertsStatus', false, 'security-detections-api.set-alerts-status'],
    ['kibana.createCase', false, 'cases.create-case'],
  ])('matches %s to its Kibana registry entry by method and path', (stepType, safe, api) => {
    expect(getStepRisk(stepType)).toMatchObject({ safe, api: { target: 'kibana', api } });
  });

  describe('KIBANA_STEP_APIS', () => {
    const contracts = getKibanaConnectors();

    it('maps every generated kibana step', () => {
      expect([...KIBANA_STEP_APIS.keys()].sort()).toEqual(contracts.map(({ type }) => type).sort());
    });

    it.each(contracts.map((contract) => [contract.type, contract] as const))(
      'maps %s to a registry API with the same method and path',
      async (stepType, { methods, patterns }) => {
        const { definition } = await kibanaRegistry.loadApi(KIBANA_STEP_APIS.get(stepType) ?? '');
        expect(methods).toContain(definition.method.toUpperCase());
        expect(patterns.map(normalizePath)).toContain(normalizePath(definition.path));
      }
    );
  });
});

describe('getWorkflowSteps', () => {
  it('resolves YAML aliases in step names and types', () => {
    const yaml = `name: alias
triggers:
  - type: manual
steps:
  - name: &delete_type elasticsearch.indices.delete
    type: *delete_type
    with:
      index: test-x
`;
    expect(getWorkflowSteps(yaml)).toEqual([
      expect.objectContaining({
        stepId: 'elasticsearch.indices.delete',
        stepType: 'elasticsearch.indices.delete',
      }),
    ]);
  });

  it('resolves child steps shared through a YAML alias', () => {
    const yaml = `name: alias
consts:
  children: &children
    - name: drop
      type: elasticsearch.indices.delete
      with:
        index: test-x
triggers:
  - type: manual
steps:
  - name: loop
    type: foreach
    foreach: '[1]'
    steps: *children
`;
    expect(getWorkflowSteps(yaml).map(({ stepId, stepType }) => [stepId, stepType])).toEqual([
      ['drop', 'elasticsearch.indices.delete'],
      ['loop', 'foreach'],
    ]);
  });

  it('throws on a recursive alias', () => {
    expect(() => getWorkflowSteps('name: &a\n  b: *a\n')).toThrow(
      'Workflow YAML has a recursive alias.'
    );
  });
});

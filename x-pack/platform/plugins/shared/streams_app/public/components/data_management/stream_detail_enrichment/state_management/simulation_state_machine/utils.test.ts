/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import { ALWAYS_CONDITION } from '@kbn/streamlang';
import type { SampleDocumentWithUIAttributes, Simulation, SimulationContext } from './types';
import {
  collectProcessorIdsForCondition,
  getActiveSamples,
  getActiveSteps,
  getConditionDocIndexes,
} from './utils';

describe('simulation utils', () => {
  const steps = [
    createAction('p1'),
    createCondition('c1'),
    createAction('p2', 'c1'),
    createCondition('c2', 'c1'),
    createAction('p3', 'c2'),
    createAction('p4'),
  ];

  describe('collectProcessorIdsForCondition', () => {
    it('includes preceding and descendant processors for a condition', () => {
      const ids = collectProcessorIdsForCondition(steps, 'c1');
      expect(ids).toEqual(['p1', 'p2', 'p3']);
    });

    it('returns empty array when condition not found', () => {
      expect(collectProcessorIdsForCondition(steps, 'missing')).toEqual([]);
    });
  });

  describe('getConditionDocIndexes', () => {
    it('returns indexes of documents processed by condition processors', () => {
      const documents = [
        { processed_by: ['p1'], status: 'parsed', value: {}, errors: [], metrics: {} },
        { processed_by: ['p4'], status: 'parsed', value: {}, errors: [], metrics: {} },
        { processed_by: ['p3'], status: 'parsed', value: {}, errors: [], metrics: {} },
      ];
      const simulation = { documents } as unknown as Simulation;
      const context = buildSimulationContext({ selectedConditionId: 'c1', simulation, steps });

      expect(getConditionDocIndexes(context)).toEqual([0, 2]);
    });

    it('returns undefined when no condition is selected', () => {
      const context = buildSimulationContext({ selectedConditionId: undefined, steps });
      expect(getConditionDocIndexes(context)).toBeUndefined();
    });
  });

  describe('getActiveSamples', () => {
    const samples: SampleDocumentWithUIAttributes[] = [
      { dataSourceId: 'ds', document: { foo: 1 } as any },
      { dataSourceId: 'ds', document: { foo: 2 } as any },
      { dataSourceId: 'ds', document: { foo: 3 } as any },
    ];

    it('returns all samples when no condition filter is active', () => {
      const context = buildSimulationContext({ samples, steps });
      expect(getActiveSamples(context)).toEqual(samples);
    });

    it('filters samples by condition doc indexes', () => {
      const documents = [
        { processed_by: ['p1'], status: 'parsed', value: {}, errors: [], metrics: {} },
        { processed_by: ['p4'], status: 'parsed', value: {}, errors: [], metrics: {} },
        { processed_by: ['p3'], status: 'parsed', value: {}, errors: [], metrics: {} },
      ];
      const simulation = { documents } as unknown as Simulation;
      const context = buildSimulationContext({
        selectedConditionId: 'c1',
        simulation,
        samples,
        steps,
      });

      expect(getActiveSamples(context)).toEqual([samples[0], samples[2]]);
    });

    it('returns empty array when no documents match the condition', () => {
      const documents = [
        { processed_by: ['p4'], status: 'parsed', value: {}, errors: [], metrics: {} },
      ];
      const simulation = { documents } as unknown as Simulation;
      const context = buildSimulationContext({
        selectedConditionId: 'c1',
        simulation,
        samples,
        steps,
      });

      expect(getActiveSamples(context)).toEqual([]);
    });
  });

  describe('getActiveSteps', () => {
    it('returns all steps when no condition filter is active', () => {
      const context = buildSimulationContext({ steps });
      expect(getActiveSteps(context)).toEqual(steps);
    });

    it('returns preceding, selected, and descendant steps for the condition', () => {
      const context = buildSimulationContext({ selectedConditionId: 'c1', steps });
      const active = getActiveSteps(context).map((step) => step.customIdentifier);
      expect(active).toEqual(['p1', 'c1', 'p2', 'c2', 'p3']);
    });
  });
});

function createAction(
  customIdentifier: string,
  parentId: StreamlangStepWithUIAttributes['parentId'] = null
): StreamlangStepWithUIAttributes {
  return {
    customIdentifier,
    parentId,
    action: 'set',
    from: 'foo',
    to: 'bar',
    where: ALWAYS_CONDITION,
  } as StreamlangStepWithUIAttributes;
}

function createCondition(
  customIdentifier: string,
  parentId: StreamlangStepWithUIAttributes['parentId'] = null
): StreamlangStepWithUIAttributes {
  return {
    customIdentifier,
    parentId,
    where: { ...ALWAYS_CONDITION, steps: [] },
  } as StreamlangStepWithUIAttributes;
}

function buildSimulationContext({
  selectedConditionId,
  simulation,
  samples,
  steps,
}: {
  selectedConditionId?: string;
  simulation?: Simulation;
  samples?: SampleDocumentWithUIAttributes[];
  steps?: StreamlangStepWithUIAttributes[];
}): SimulationContext {
  return {
    detectedSchemaFields: [],
    detectedSchemaFieldsCache: new Map(),
    previewDocsFilter: 'outcome_filter_all',
    explicitlyDisabledPreviewColumns: [],
    explicitlyEnabledPreviewColumns: [],
    previewColumnsOrder: [],
    previewColumnsSorting: { fieldName: undefined, direction: 'asc' },
    steps,
    samples: samples ?? [],
    selectedConditionId,
    simulation,
    streamName: 'stream',
    streamType: 'classic',
    baseSimulation: undefined,
  } as SimulationContext;
}

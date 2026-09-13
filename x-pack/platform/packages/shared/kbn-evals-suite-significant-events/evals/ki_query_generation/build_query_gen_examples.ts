/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/significant-events-schema';
import type { KIQueryGenerationScenario } from '../../src/datasets';

export interface CollectedQueryGenExample {
  scenario: KIQueryGenerationScenario;
  kis: Feature[];
  sampleLogs: string[];
  sampleDocs: Array<Record<string, unknown>>;
}

// Rerun arms need canonical KIs to be evaluable; fail setup before computed KIs mask it.
export const assertRerunRequiresCanonicalKIs = (
  scenario: KIQueryGenerationScenario,
  canonicalKIs: Feature[]
): void => {
  if (scenario.rerun && canonicalKIs.length === 0) {
    throw new Error(
      `Rerun scenario "${scenario.input.scenario_id}" requires matching canonical ground truth, ` +
        `but no canonical KIs were derived from expected_ground_truth.`
    );
  }
};

// Rerun scenarios expand into a clean arm plus a `:rerun` arm that seeds existing_queries.
export const buildQueryGenerationExamples = (
  collectedExamples: CollectedQueryGenExample[],
  testIndex: string
) =>
  collectedExamples.flatMap(({ scenario }) => {
    const cleanExample = {
      id: scenario.input.scenario_id,
      input: {
        ...scenario.input,
        snapshot_source: scenario.snapshot_source,
      },
      output: {
        ...scenario.output,
        criteria: scenario.output.criteria,
        expected: scenario.output.expected_ground_truth,
      },
      metadata: {
        ...scenario.metadata,
        test_index: testIndex,
        evaluation_arm: 'clean',
      },
    };

    if (!scenario.rerun) {
      return [cleanExample];
    }

    return [
      cleanExample,
      {
        id: `${scenario.input.scenario_id}:rerun`,
        input: {
          ...scenario.input,
          snapshot_source: scenario.snapshot_source,
          existing_queries: scenario.rerun.existing_queries,
        },
        output: {
          ...scenario.output,
          criteria: scenario.rerun.criteria,
          expected: scenario.output.expected_ground_truth,
        },
        metadata: {
          ...scenario.metadata,
          test_index: testIndex,
          evaluation_arm: 'rerun',
        },
      },
    ];
  });

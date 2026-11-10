/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { loadEntityGraphTraversalScenarioStepDefinition } from './load_entity_graph_traversal_scenario_step';
import { loadEntityGraphTraversalScenarioInputSchema } from '../../../../common/workflow/steps/entity_graph_traversal/load_entity_graph_traversal_scenario_step_common';

const LATEST_INDEX = '.entities.v2.latest.default-00001';

const createContext = (
  rawInput: unknown,
  alias: Record<string, unknown> | Error = { [LATEST_INDEX]: {} }
): StepHandlerContext =>
  ({
    input: loadEntityGraphTraversalScenarioInputSchema.parse(rawInput),
    config: {},
    rawInput,
    contextManager: {
      getContext: jest.fn().mockReturnValue({ workflow: { spaceId: 'default' } }),
      getScopedEsClient: jest.fn().mockReturnValue({
        indices: {
          getAlias:
            alias instanceof Error
              ? jest.fn().mockRejectedValue(alias)
              : jest.fn().mockResolvedValue(alias),
        },
      }),
      callKibanaApi: jest.fn().mockResolvedValue({ body: { id: 'default' } }),
      renderInputTemplate: jest.fn(),
      getFakeRequest: jest.fn(),
    },
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    abortSignal: new AbortController().signal,
    stepId: 'load_scenario',
    stepType: loadEntityGraphTraversalScenarioStepDefinition.id,
  } as unknown as StepHandlerContext);

describe('entityStore.loadEntityGraphTraversalScenario', () => {
  it('resolves the execution space and the lookup index once for the hops', async () => {
    const result = await loadEntityGraphTraversalScenarioStepDefinition.handler(
      createContext({ scenario_id: 'okta-user-to-aws-resources' })
    );
    expect(result.error).toBeUndefined();
    expect(result.output).toMatchObject({ space_id: 'default', lookup_index: LATEST_INDEX });
  });

  it('leaves the lookup index out when the space has no latest entity index', async () => {
    const result = await loadEntityGraphTraversalScenarioStepDefinition.handler(
      createContext({ scenario_id: 'okta-user-to-aws-resources' }, new Error('no alias'))
    );
    expect(result.error).toBeUndefined();
    expect(result.output).toMatchObject({ space_id: 'default' });
    expect(result.output).not.toHaveProperty('lookup_index');
  });

  it('loads a shipped scenario and expands its hops', async () => {
    const result = await loadEntityGraphTraversalScenarioStepDefinition.handler(
      createContext({ scenario_id: 'okta-user-to-aws-resources' })
    );
    expect(result.error).toBeUndefined();
    expect(result.output).toMatchObject({
      id: 'okta-user-to-aws-resources',
      limits: { max_hops: 7 },
    });
    expect(result.output?.hops).toHaveLength(7);
    expect(result.output).toMatchObject({ direction: 'out' });
    expect(result.output?.hops[0]).toMatchObject({
      hop_number: 1,
      name: 'okta_groups',
      match_field: 'entity.id',
      target_fields: [{ field: 'entity.relationships.member_of.ids', relation: 'member_of' }],
    });
  });

  it('treats empty template values as unset and clamps overrides to the ceilings', async () => {
    const result = await loadEntityGraphTraversalScenarioStepDefinition.handler(
      createContext({
        scenario_id: 'okta-user-to-aws-resources',
        overrides: { max_hops: 2, max_nodes: '', max_frontier: 999999, hub_degree: undefined },
      })
    );
    expect(result.error).toBeUndefined();
    expect(result.output?.hops).toHaveLength(2);
    expect(result.output?.limits).toMatchObject({
      max_hops: 2,
      max_nodes: 1000,
      max_frontier: 500,
      hub_degree: 200,
    });
  });

  it('appends the run stop conditions to the scenario ones', async () => {
    const result = await loadEntityGraphTraversalScenarioStepDefinition.handler(
      createContext({
        scenario_id: 'okta-user-to-aws-resources',
        until: [{ field: 'entity.id', values: ['arn:aws:s3:::acme-data-lake'] }],
      })
    );
    expect(result.error).toBeUndefined();
    expect(result.output?.until).toEqual([
      { field: 'entity.id', values: ['arn:aws:s3:::acme-data-lake'] },
    ]);
    const none = await loadEntityGraphTraversalScenarioStepDefinition.handler(
      createContext({ scenario_id: 'okta-user-to-aws-resources', until: '' })
    );
    expect(none.output?.until).toEqual([]);
  });

  it('fails with the list of available scenarios for an unknown id', async () => {
    const result = await loadEntityGraphTraversalScenarioStepDefinition.handler(
      createContext({ scenario_id: 'nope' })
    );
    expect(result.output).toBeUndefined();
    expect(result.error?.message).toContain('Unknown entity graph traversal scenario "nope"');
    expect(result.error?.message).toContain('okta-user-to-aws-resources');
  });
});

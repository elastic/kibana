/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowSchema } from '@kbn/workflows/spec/schema';
import { parseWorkflowYamlToJSON } from '@kbn/workflows-yaml';
import {
  buildOnlineEvalWorkflowYaml,
  parseOnlineEvalWorkflowYaml,
  type OnlineEvalWorkflowConfig,
} from './workflow_yaml';

const getConfig = (): OnlineEvalWorkflowConfig => ({
  name: 'My online monitor',
  indexPattern: 'traces-agent_builder.otel-default',
  extraEsqlWhere: "attributes.agent_id == 'agent-1'",
  windowMinutes: 45,
  lagMinutes: 15,
  maxTracesPerRun: 25,
  every: '1h',
  evaluators: [{ name: 'correctness', version: 'v1' }, { name: 'trace_readiness' }],
  connectorId: 'connector-123',
});

describe('online eval workflow yaml', () => {
  it('builds a workflow yaml snapshot and validates against WorkflowSchema', () => {
    const yaml = buildOnlineEvalWorkflowYaml(getConfig());

    expect(yaml).toMatchSnapshot();

    const parsed = parseWorkflowYamlToJSON(yaml, WorkflowSchema);
    expect(parsed.success).toBe(true);
  });

  it('round-trips generated yaml back to the online eval config', () => {
    const config = getConfig();
    const yaml = buildOnlineEvalWorkflowYaml(config);

    expect(parseOnlineEvalWorkflowYaml(yaml)).toEqual(config);
  });

  it('returns undefined for non-online-evals workflows', () => {
    const config = getConfig();
    const yaml = buildOnlineEvalWorkflowYaml(config).replace('evals-online', 'not-online');

    expect(parseOnlineEvalWorkflowYaml(yaml)).toBeUndefined();
  });
});

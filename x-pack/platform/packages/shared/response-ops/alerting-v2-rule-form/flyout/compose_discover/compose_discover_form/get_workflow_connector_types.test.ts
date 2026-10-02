/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowYaml } from '@kbn/workflows';
import {
  getWorkflowConnectorTypes,
  unionWorkflowConnectorTypes,
} from './get_workflow_connector_types';

describe('getWorkflowConnectorTypes', () => {
  it('returns connector types for flat steps', () => {
    const definition = {
      steps: [
        { type: '.email', name: 'send email' },
        { type: '.slack', name: 'send slack' },
      ],
    } as unknown as WorkflowYaml;

    expect(getWorkflowConnectorTypes(definition)).toEqual(['email', 'slack']);
  });

  it('deduplicates connector types within one workflow', () => {
    const definition = {
      steps: [
        { type: 'slack.postMessage', name: 'slack 1' },
        { type: 'slack_api.sendMessage', name: 'slack 2' },
      ],
    } as unknown as WorkflowYaml;

    expect(getWorkflowConnectorTypes(definition)).toEqual(['slack']);
  });

  it('returns an empty array when definition is missing', () => {
    expect(getWorkflowConnectorTypes(undefined)).toEqual([]);
  });
});

describe('unionWorkflowConnectorTypes', () => {
  it('unions types across workflows in first-seen order', () => {
    const wf1 = {
      steps: [{ type: '.email', name: 'email' }],
    } as unknown as WorkflowYaml;
    const wf2 = {
      steps: [
        { type: '.slack', name: 'slack' },
        { type: '.email', name: 'email again' },
      ],
    } as unknown as WorkflowYaml;

    expect(unionWorkflowConnectorTypes([wf1, wf2])).toEqual(['email', 'slack']);
  });
});

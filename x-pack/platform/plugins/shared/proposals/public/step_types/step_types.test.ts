/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import {
  CheckDecidePrivilegesStepId,
  CloneProposalStepId,
  CreateProposalStepId,
  GetLatestRevisionStepId,
  GetProposalStepId,
  SettleIncompleteProposalStepId,
  UpdateProposalStepId,
} from '@kbn/proposals-common';
import { registerProposalsPublicStepDefinitions } from '.';
import { ProposalsStepIcon } from './proposals_step_icon';

type Loader = () => Promise<{ id: string } | undefined>;

const register = () => {
  const registerStepDefinition = jest.fn();
  registerProposalsPublicStepDefinitions({
    registerStepDefinition,
  } as unknown as WorkflowsExtensionsPublicPluginSetup);

  return registerStepDefinition.mock.calls.map(([definition]) => definition as Loader);
};

describe('proposals public step definitions', () => {
  it('should register every step as a loader, so none reaches the page-load bundle', () => {
    const registered = register();

    expect(registered).toHaveLength(7);
    for (const definition of registered) {
      expect(typeof definition).toBe('function');
    }
  });

  it('should resolve to the seven distinct step ids', async () => {
    // Near-identical modules, so a copy-paste slip would otherwise silently
    // register the same definition twice and drop a step from the YAML editor.
    const resolved = await Promise.all(register().map((load) => load()));

    expect(resolved.map((definition) => definition?.id)).toEqual([
      CreateProposalStepId,
      UpdateProposalStepId,
      CheckDecidePrivilegesStepId,
      GetProposalStepId,
      CloneProposalStepId,
      SettleIncompleteProposalStepId,
      GetLatestRevisionStepId,
    ]);
  });

  it('should give every step the proposals icon', async () => {
    const resolved = await Promise.all(register().map((load) => load()));

    for (const definition of resolved) {
      expect(definition).toHaveProperty('icon', ProposalsStepIcon);
    }
  });

  it('should mark every step internal, since they only exist for the managed workflows', async () => {
    const resolved = await Promise.all(register().map((load) => load()));

    for (const definition of resolved) {
      expect(definition).toHaveProperty('exposure', 'internal');
    }
  });
});

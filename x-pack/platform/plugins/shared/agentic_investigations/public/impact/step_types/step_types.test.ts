/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { AttachImpactStepId, GetImpactStepId } from '../../../common/impact/step_types';
import { registerImpactPublicStepDefinitions } from '.';

type Loader = () => Promise<{ id: string } | undefined>;

const register = () => {
  const registerStepDefinition = jest.fn();
  registerImpactPublicStepDefinitions({
    registerStepDefinition,
  } as unknown as WorkflowsExtensionsPublicPluginSetup);

  return registerStepDefinition.mock.calls.map(([definition]) => definition as Loader);
};

describe('impact public step definitions', () => {
  it('should register every step as a loader, so none reaches the page-load bundle', () => {
    const registered = register();

    expect(registered).toHaveLength(2);
    for (const definition of registered) {
      expect(typeof definition).toBe('function');
    }
  });

  it('should resolve to the two distinct step ids', async () => {
    const resolved = await Promise.all(register().map((load) => load()));

    expect(resolved.map((definition) => definition?.id)).toEqual([
      AttachImpactStepId,
      GetImpactStepId,
    ]);
  });

  it('should give each step its own icon', async () => {
    const resolved = await Promise.all(register().map((load) => load()));

    for (const definition of resolved) {
      expect(definition).toHaveProperty('icon');
    }
  });
});

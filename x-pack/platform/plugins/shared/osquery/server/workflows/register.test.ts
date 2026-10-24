/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { registerOsqueryWorkflowSteps } from './register';

describe('registerOsqueryWorkflowSteps (server)', () => {
  const setup = () => ({ registerStepDefinition: jest.fn() });
  const asPlugin = (plugin: ReturnType<typeof setup>) =>
    plugin as unknown as WorkflowsExtensionsServerPluginSetup;

  it('registers runQuery with the flag on and the plugin present', () => {
    const plugin = setup();

    const registered = registerOsqueryWorkflowSteps({
      experimentalFeatures: { workflowsExtensionsEnabled: true },
      workflowsExtensions: asPlugin(plugin),
    });

    expect(registered).toBe(true);
    expect(plugin.registerStepDefinition.mock.calls.map(([definition]) => definition.id)).toEqual([
      'osquery.runQuery',
    ]);
  });

  it('registers nothing with the flag off', () => {
    const plugin = setup();

    const registered = registerOsqueryWorkflowSteps({
      experimentalFeatures: { workflowsExtensionsEnabled: false },
      workflowsExtensions: asPlugin(plugin),
    });

    expect(registered).toBe(false);
    expect(plugin.registerStepDefinition).not.toHaveBeenCalled();
  });

  it('does not fail without the workflowsExtensions plugin, flag on or off', () => {
    expect(
      registerOsqueryWorkflowSteps({ experimentalFeatures: { workflowsExtensionsEnabled: true } })
    ).toBe(false);
    expect(
      registerOsqueryWorkflowSteps({ experimentalFeatures: { workflowsExtensionsEnabled: false } })
    ).toBe(false);
  });

  it('defaults the flag to off', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { allowedExperimentalValues } = require('../../common/experimental_features');

    expect(allowedExperimentalValues.workflowsExtensionsEnabled).toBe(false);
  });
});

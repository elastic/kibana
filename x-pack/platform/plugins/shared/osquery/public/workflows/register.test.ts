/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { registerOsqueryWorkflowSteps } from './register';

describe('registerOsqueryWorkflowSteps (public)', () => {
  const http = httpServiceMock.createSetupContract();
  const setup = () => ({ registerStepDefinition: jest.fn() });
  const asPlugin = (plugin: ReturnType<typeof setup>) =>
    plugin as unknown as WorkflowsExtensionsPublicPluginSetup;

  it('registers the step definition lazily with the flag on and the plugin present', async () => {
    const plugin = setup();

    const registered = registerOsqueryWorkflowSteps({
      experimentalFeatures: { workflowsExtensionsEnabled: true },
      workflowsExtensions: asPlugin(plugin),
      http,
    });

    expect(registered).toBe(true);
    const loaded = await Promise.all(
      plugin.registerStepDefinition.mock.calls.map(([load]) => load())
    );
    expect(loaded.map((definition) => definition.id)).toEqual(['osquery.runQuery']);
    expect(loaded.map((definition) => Object.keys(definition.editorHandlers?.input ?? {}))).toEqual(
      [['saved_query']]
    );
  });

  it('registers nothing with the flag off or without the plugin', () => {
    const plugin = setup();

    expect(
      registerOsqueryWorkflowSteps({
        experimentalFeatures: { workflowsExtensionsEnabled: false },
        workflowsExtensions: asPlugin(plugin),
        http,
      })
    ).toBe(false);
    expect(
      registerOsqueryWorkflowSteps({
        experimentalFeatures: { workflowsExtensionsEnabled: true },
        http,
      })
    ).toBe(false);
    expect(plugin.registerStepDefinition).not.toHaveBeenCalled();
  });
});

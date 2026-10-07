/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { workflowsExtensionsMock } from '@kbn/workflows-extensions/public/mocks';
import { AlertStatusChangedTriggerId } from '../../../common/workflows/triggers';
import { registerTriggerDefinitions } from './register_trigger_definitions';

describe('registerTriggerDefinitions', () => {
  it('registers the alert status changed trigger as a lazy loader', async () => {
    const workflowsExtensions = workflowsExtensionsMock.createSetup();

    registerTriggerDefinitions(workflowsExtensions);

    expect(workflowsExtensions.registerTriggerDefinition).toHaveBeenCalledTimes(1);
    const [loader] = workflowsExtensions.registerTriggerDefinition.mock.calls[0];
    expect(loader).toEqual(expect.any(Function));
  });

  it('resolves to a public definition with the server trigger id and an icon', async () => {
    const workflowsExtensions = workflowsExtensionsMock.createSetup();
    registerTriggerDefinitions(workflowsExtensions);
    const [loader] = workflowsExtensions.registerTriggerDefinition.mock.calls[0];

    const definition = typeof loader === 'function' ? await loader() : loader;

    expect(definition.id).toBe(AlertStatusChangedTriggerId);
    expect(definition.stability).toBe('tech_preview');
    expect(definition.icon).toBeDefined();
  });
});

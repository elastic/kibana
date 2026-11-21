/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { registerInternalStepDefinitions } from '.';
import { ScriptsJavaScriptStepTypeId } from '../../common/steps/javascript';
import { ServerStepRegistry } from '../step_registry';

describe('registerInternalStepDefinitions', () => {
  it('does not register code.javascript when javaScriptStep is disabled', () => {
    const registry = new ServerStepRegistry(loggerMock.create());

    registerInternalStepDefinitions(registry, {
      experimentalSteps: { javaScriptStep: false },
    });

    expect(registry.has(ScriptsJavaScriptStepTypeId)).toBe(false);
  });

  it('registers code.javascript when javaScriptStep is enabled', () => {
    const registry = new ServerStepRegistry(loggerMock.create());

    registerInternalStepDefinitions(registry, {
      experimentalSteps: { javaScriptStep: true },
    });

    expect(registry.has(ScriptsJavaScriptStepTypeId)).toBe(true);
  });
});

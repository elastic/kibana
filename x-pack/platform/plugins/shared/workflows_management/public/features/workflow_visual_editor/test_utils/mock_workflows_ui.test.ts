/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { builtInStepDefinitions } from '@kbn/workflows';
import type { stepSupportsErrorHandlingSettings } from '@kbn/workflows-ui';
import { createWorkflowsUiModuleMock } from './mock_workflows_ui';

describe('createWorkflowsUiModuleMock', () => {
  // The mock re-implements this predicate because the package entry cannot be loaded next to it
  // in the panel tests (it reads Monaco enums at import time); this keeps the copy from drifting.
  const real = jest.requireActual<{
    stepSupportsErrorHandlingSettings: typeof stepSupportsErrorHandlingSettings;
  }>('@kbn/workflows-ui');
  const mock = createWorkflowsUiModuleMock();

  const stepTypes = [
    ...builtInStepDefinitions.map(({ id }) => id),
    'atomic',
    'elasticsearch.search',
    'kibana.createCase',
    'custom.connector',
    '',
    undefined,
  ];

  it('covers loops, which the canvas keeps without a fallback port', () => {
    expect(stepTypes).toEqual(
      expect.arrayContaining(['foreach', 'while', 'if', 'parallel', 'atomic'])
    );
  });

  it.each(stepTypes)('agrees with the real stepSupportsErrorHandlingSettings for %p', (type) => {
    expect(mock.stepSupportsErrorHandlingSettings(type)).toBe(
      real.stepSupportsErrorHandlingSettings(type)
    );
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The part of `@kbn/workflows-ui` the step config panel uses, without loading the package: the
 * real one reads Monaco enums at import time, which jsdom has none of.
 *
 *   jest.mock('@kbn/workflows-ui', () =>
 *     jest.requireActual('../test_utils/mock_workflows_ui').createWorkflowsUiModuleMock()
 *   );
 *
 * Tests that need the real `WorkflowsUiServicesProvider` (and so `TestProvider`) cannot use it.
 */
export const createWorkflowsUiModuleMock = () => ({
  workflowsEditorChromeOverrides: {},
  ensureWorkflowGraphEuiIcons: jest.fn(),
  loadTypeIconMasks: () => Promise.resolve({}),
  resolveNodeChipStyle: () => ({
    background: 'bg',
    border: 'border',
    iconColor: 'icon',
    isBrand: false,
  }),
  // Loops take the panel section, though their canvas node has no fallback port.
  stepSupportsErrorHandlingSettings: (stepType: string | undefined) =>
    Boolean(stepType && !['if', 'parallel', 'atomic'].includes(stepType)),
});

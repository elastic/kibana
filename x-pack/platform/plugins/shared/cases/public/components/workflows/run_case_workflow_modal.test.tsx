/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RunCaseWorkflowModal } from './run_case_workflow_modal';

const mockRunWorkflowPanel = jest.fn((_props: unknown) => null);
jest.mock('@kbn/workflows-ui', () => ({
  RunWorkflowPanel: (props: unknown) => mockRunWorkflowPanel(props),
}));

describe('RunCaseWorkflowModal', () => {
  it('forwards the Cases workflow executor to the shared panel', () => {
    const runWorkflow = jest.fn();
    const filterWorkflow = jest.fn(() => true);

    render(
      <RunCaseWorkflowModal
        inputs={{ event: { caseId: 'case-1' } }}
        runWorkflow={runWorkflow}
        filterWorkflow={filterWorkflow}
        onClose={jest.fn()}
      />
    );

    expect(mockRunWorkflowPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        inputs: { event: { caseId: 'case-1' } },
        runWorkflow,
        filterWorkflow,
      })
    );
  });
});

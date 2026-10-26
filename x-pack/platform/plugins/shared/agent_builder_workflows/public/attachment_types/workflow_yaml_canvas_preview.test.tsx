/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { parseWorkflowForGraph, WorkflowYamlCanvasPreview } from './workflow_yaml_canvas_preview';

jest.mock('@kbn/workflows-ui', () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TypeIcon: () => <span data-test-subj="mockTypeIcon" />,
  WorkflowYamlPreview: ({
    yaml,
    'data-test-subj': dataTestSubj,
  }: {
    yaml: string;
    'data-test-subj'?: string;
  }) => <pre data-test-subj={dataTestSubj}>{yaml}</pre>,
  WorkflowDetailBottomBar: ({
    editorView,
    onEditorViewChange,
    showViewToggle,
  }: {
    editorView: 'graph' | 'yaml';
    onEditorViewChange: (next: 'graph' | 'yaml') => void;
    showViewToggle?: boolean;
  }) => (
    <div data-test-subj="mockBottomBar" data-view={editorView}>
      {showViewToggle ? (
        <button
          type="button"
          data-test-subj="mockToggleView"
          onClick={() => onEditorViewChange(editorView === 'graph' ? 'yaml' : 'graph')}
        />
      ) : null}
    </div>
  ),
  WorkflowVisualEditorFlyout: ({
    target,
    onOpenInYaml,
  }: {
    target: { yamlSnippet?: string; triggerLabel?: string };
    onOpenInYaml?: () => void;
  }) => (
    <div data-test-subj="mockStepFlyout">
      <span data-test-subj="mockStepFlyoutTriggerLabel">{target.triggerLabel}</span>
      {target.yamlSnippet}
      <button type="button" data-test-subj="mockOpenInYaml" onClick={onOpenInYaml} />
    </div>
  ),
  WorkflowGraphCanvasWithoutProvider: ({
    onStepSelect,
    transformed,
  }: {
    transformed: { nodeRefs: Record<string, { kind: string }> };
    onStepSelect: (stepId: string) => void;
  }) => {
    const findNodeId = (kind: string) =>
      Object.entries(transformed.nodeRefs).find(([, ref]) => ref.kind === kind)?.[0];
    const stepNodeId = findNodeId('step');
    const triggerNodeId = findNodeId('trigger');
    return (
      <>
        <button
          type="button"
          data-test-subj="mockGraphCanvas"
          onClick={() => stepNodeId && onStepSelect(stepNodeId)}
        />
        <button
          type="button"
          data-test-subj="mockGraphCanvasTrigger"
          onClick={() => triggerNodeId && onStepSelect(triggerNodeId)}
        />
      </>
    );
  },
}));

const VALID_YAML = `name: Test
triggers:
  - type: manual
steps:
  - name: say_hello
    type: console
    with:
      message: hello
`;

describe('parseWorkflowForGraph', () => {
  it('returns the workflow and its graph for valid workflow YAML', () => {
    const result = parseWorkflowForGraph(VALID_YAML);

    expect(result?.workflow.name).toBe('Test');
    expect(Object.values(result?.transformed.nodeRefs ?? {})).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'step', stepName: 'say_hello' })])
    );
  });

  it('returns undefined for invalid YAML', () => {
    expect(parseWorkflowForGraph('steps: [\n  - name: x')).toBeUndefined();
  });

  it('returns undefined when steps or triggers are not arrays', () => {
    expect(parseWorkflowForGraph('steps:\n  say_hello:\n    type: console\n')).toBeUndefined();
    expect(parseWorkflowForGraph('triggers:\n  type: manual\n')).toBeUndefined();
  });

  it('returns undefined for a scalar document', () => {
    expect(parseWorkflowForGraph('just a string')).toBeUndefined();
  });
});

describe('WorkflowYamlCanvasPreview', () => {
  it('shows the graph view by default for valid workflow YAML', () => {
    render(<WorkflowYamlCanvasPreview yaml={VALID_YAML} showGraph />);

    expect(screen.getByTestId('mockGraphCanvas')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowYamlCanvasPreview-yaml')).not.toBeInTheDocument();
    expect(screen.getByTestId('mockToggleView')).toBeInTheDocument();
  });

  it('switches to the YAML view with the bottom bar toggle', () => {
    render(<WorkflowYamlCanvasPreview yaml={VALID_YAML} showGraph />);

    fireEvent.click(screen.getByTestId('mockToggleView'));

    expect(screen.getByTestId('workflowYamlCanvasPreview-yaml')).toHaveTextContent('say_hello');
    expect(screen.queryByTestId('mockGraphCanvas')).not.toBeInTheDocument();
  });

  it('shows only the YAML view and hides the toggle when the YAML cannot be graphed', () => {
    render(<WorkflowYamlCanvasPreview yaml={'steps:\n  not: a list\n'} showGraph />);

    expect(screen.getByTestId('workflowYamlCanvasPreview-yaml')).toBeInTheDocument();
    expect(screen.queryByTestId('mockGraphCanvas')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockToggleView')).not.toBeInTheDocument();
  });

  it('shows only the YAML view without the bottom bar when the graph is disabled', () => {
    render(<WorkflowYamlCanvasPreview yaml={VALID_YAML} showGraph={false} />);

    expect(screen.getByTestId('workflowYamlCanvasPreview-yaml')).toBeInTheDocument();
    expect(screen.queryByTestId('mockGraphCanvas')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockBottomBar')).not.toBeInTheDocument();
  });

  it('opens the step details when a graph node is selected', () => {
    render(<WorkflowYamlCanvasPreview yaml={VALID_YAML} showGraph />);

    fireEvent.click(screen.getByTestId('mockGraphCanvas'));

    expect(screen.getByTestId('workflowYamlCanvasPreview-stepFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('mockStepFlyout')).toHaveTextContent('name: say_hello');
  });

  it('titles the trigger details with the graph node label', () => {
    render(<WorkflowYamlCanvasPreview yaml={VALID_YAML} showGraph />);

    fireEvent.click(screen.getByTestId('mockGraphCanvasTrigger'));

    expect(screen.getByTestId('mockStepFlyoutTriggerLabel')).toHaveTextContent('Manual');
    expect(screen.getByTestId('mockStepFlyout')).toHaveTextContent('type: manual');
  });

  it('closes the step details with Escape', () => {
    render(<WorkflowYamlCanvasPreview yaml={VALID_YAML} showGraph />);
    fireEvent.click(screen.getByTestId('mockGraphCanvas'));

    fireEvent.keyDown(screen.getByTestId('workflowYamlCanvasPreview-stepFlyout'), {
      key: 'Escape',
    });

    expect(screen.queryByTestId('workflowYamlCanvasPreview-stepFlyout')).not.toBeInTheDocument();
  });

  it('switches to the YAML view from the step details', () => {
    render(<WorkflowYamlCanvasPreview yaml={VALID_YAML} showGraph />);
    fireEvent.click(screen.getByTestId('mockGraphCanvas'));

    fireEvent.click(screen.getByTestId('mockOpenInYaml'));

    expect(screen.getByTestId('workflowYamlCanvasPreview-yaml')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowYamlCanvasPreview-stepFlyout')).not.toBeInTheDocument();
  });
});

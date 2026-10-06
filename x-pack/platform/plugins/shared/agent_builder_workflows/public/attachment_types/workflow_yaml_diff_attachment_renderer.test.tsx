/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

jest.mock('@kbn/code-editor', () => ({
  monaco: {
    editor: {
      createModel: jest.fn(() => ({ dispose: jest.fn() })),
      createDiffEditor: jest.fn(() => ({
        setModel: jest.fn(),
        updateOptions: jest.fn(),
        getModifiedEditor: jest.fn(() => ({ layout: jest.fn() })),
        dispose: jest.fn(),
      })),
    },
  },
}));

jest.mock('@kbn/workflows-ui', () => {
  const actual = jest.requireActual('@kbn/workflows-ui');
  return {
    ...actual,
    useWorkflowsMonacoTheme: jest.fn(),
    WORKFLOWS_MONACO_EDITOR_THEME: 'test-theme',
    computeWorkflowYamlDiffStats: jest.fn(actual.computeWorkflowYamlDiffStats),
  };
});

// Import after mocks so the mocked module is used

import { computeWorkflowYamlDiffStats } from '@kbn/workflows-ui';

import { workflowYamlDiffAttachmentUiDefinition } from './workflow_yaml_diff_attachment_renderer';

const mockedComputeStats = computeWorkflowYamlDiffStats as jest.MockedFunction<
  typeof computeWorkflowYamlDiffStats
>;

const makeAttachment = (
  overrides: Partial<{ beforeYaml: string; afterYaml: string; name: string }> = {}
) => ({
  id: 'diff-1',
  type: 'workflow.yaml.diff',
  data: {
    beforeYaml: overrides.beforeYaml ?? 'name: original\nsteps: []\n',
    afterYaml: overrides.afterYaml ?? 'name: updated\nsteps: []\n',
    proposalId: 'prop-1',
    ...(overrides.name ? { name: overrides.name } : {}),
  },
});

describe('workflowYamlDiffAttachmentUiDefinition', () => {
  beforeEach(() => {
    mockedComputeStats.mockClear();
  });

  it('renders the header with the workflow name and +N -M line stats', () => {
    const attachment = makeAttachment({
      beforeYaml: 'a\nb\n',
      afterYaml: 'a\nc\nd\n',
      name: 'My workflow',
    });

    const { getByText } = render(
      <>
        {workflowYamlDiffAttachmentUiDefinition.renderInlineContent!({
          attachment,
          isSidebar: false,
        })}
      </>
    );

    expect(getByText('My workflow')).toBeInTheDocument();
    expect(getByText('+2')).toBeInTheDocument();
    expect(getByText('−1')).toBeInTheDocument();
  });

  it('falls back to the "Workflow" label when no name is present', () => {
    const attachment = makeAttachment();

    const { getByText } = render(
      <>
        {workflowYamlDiffAttachmentUiDefinition.renderInlineContent!({
          attachment,
          isSidebar: false,
        })}
      </>
    );

    expect(getByText('Workflow')).toBeInTheDocument();
  });

  it('computes diff stats exactly once per (beforeYaml, afterYaml) render — no wasted diff work', () => {
    const attachment = makeAttachment({ beforeYaml: 'a\nb\n', afterYaml: 'a\nc\n' });

    render(
      <>
        {workflowYamlDiffAttachmentUiDefinition.renderInlineContent!({
          attachment,
          isSidebar: false,
        })}
      </>
    );

    // Header stats + MonacoDiffViewer height estimation must share a single
    // computation — a second call would mean the memoization broke.
    expect(mockedComputeStats).toHaveBeenCalledTimes(1);
    expect(mockedComputeStats).toHaveBeenCalledWith('a\nb\n', 'a\nc\n');
  });

  it('does not recompute diff stats on rerender when inputs are stable', () => {
    const attachment = makeAttachment({ beforeYaml: 'a\nb\n', afterYaml: 'a\nc\n' });

    const { rerender } = render(
      <>
        {workflowYamlDiffAttachmentUiDefinition.renderInlineContent!({
          attachment,
          isSidebar: false,
        })}
      </>
    );

    rerender(
      <>
        {workflowYamlDiffAttachmentUiDefinition.renderInlineContent!({
          attachment,
          isSidebar: false,
        })}
      </>
    );

    expect(mockedComputeStats).toHaveBeenCalledTimes(1);
  });

  it('shows "No changes detected" and skips diff work when before === after', () => {
    const attachment = makeAttachment({ beforeYaml: 'same\n', afterYaml: 'same\n' });

    const { getByText } = render(
      <>
        {workflowYamlDiffAttachmentUiDefinition.renderInlineContent!({
          attachment,
          isSidebar: false,
        })}
      </>
    );

    expect(getByText('No changes detected')).toBeInTheDocument();
  });
});

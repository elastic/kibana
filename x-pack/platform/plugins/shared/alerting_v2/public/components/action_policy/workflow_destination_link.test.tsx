/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { WorkflowDestinationLink } from './workflow_destination_link';

const mockUseFetchWorkflow = vi.fn();

vi.mock('../../hooks/use_fetch_workflow', () => {
  const mocked = {
    useFetchWorkflow: (...args: unknown[]) => mockUseFetchWorkflow(...args),
  };
  return { ...mocked, default: mocked };
});

const mockGetUrlForApp = vi.fn(
  (_appId: string, { path }: { path: string }) => `/app/workflows${path}`
);

vi.mock('@kbn/core-di-browser', () => {
  const mocked = {
    useService: () => ({ getUrlForApp: mockGetUrlForApp }),
    CoreStart: (key: string) => key,
  };
  return { ...mocked, default: mocked };
});

describe('WorkflowDestinationLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUrlForApp.mockImplementation(
      (_appId: string, { path }: { path: string }) => `/app/workflows${path}`
    );
  });

  describe('when name is provided (WorkflowLink)', () => {
    it('renders the name as a link for persisted workflows', () => {
      render(<WorkflowDestinationLink id="wf-1" name="My Workflow" />);

      const link = screen.getByText('My Workflow');
      expect(link.closest('a')).toBeDefined();
      expect(mockUseFetchWorkflow).not.toHaveBeenCalled();
    });

    it('renders a Draft badge when isDraft is true', () => {
      render(<WorkflowDestinationLink id="wf-1" name="Draft Workflow" isDraft={true} />);

      expect(screen.getByText('Draft Workflow')).toBeDefined();
      expect(screen.getByText('Draft')).toBeDefined();
      expect(screen.queryByRole('link')).toBeNull();
    });

    it('does not render a Draft badge when isDraft is false', () => {
      render(<WorkflowDestinationLink id="wf-1" name="Saved Workflow" isDraft={false} />);

      expect(screen.getByText('Saved Workflow')).toBeDefined();
      expect(screen.queryByText('Draft')).toBeNull();
    });
  });

  describe('when name is omitted (FetchingWorkflowLink)', () => {
    it('fetches the workflow name and renders it', () => {
      mockUseFetchWorkflow.mockReturnValue({
        data: { id: 'wf-1', name: 'Fetched Workflow' },
      });

      render(<WorkflowDestinationLink id="wf-1" />);

      expect(mockUseFetchWorkflow).toHaveBeenCalledWith('wf-1', true);
      expect(screen.getByText('Fetched Workflow')).toBeDefined();
    });

    it('falls back to the id when the fetch returns no data', () => {
      mockUseFetchWorkflow.mockReturnValue({ data: undefined });

      render(<WorkflowDestinationLink id="wf-1" />);

      expect(screen.getByText('wf-1')).toBeDefined();
    });

    it('passes isEnabled to useFetchWorkflow', () => {
      mockUseFetchWorkflow.mockReturnValue({ data: undefined });

      render(<WorkflowDestinationLink id="wf-1" isEnabled={false} />);

      expect(mockUseFetchWorkflow).toHaveBeenCalledWith('wf-1', false);
    });
  });
});

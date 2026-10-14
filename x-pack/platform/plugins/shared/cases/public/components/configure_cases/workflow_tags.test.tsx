/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MAX_LENGTH_PER_WORKFLOW_TAG,
  MAX_WORKFLOW_TAGS_PER_CONFIGURATION,
} from '../../../common/constants';
import { renderWithTestingProviders } from '../../common/mock';
import { useGetWorkflowTags } from '../../containers/configure/use_get_workflow_tags';
import { WorkflowTags } from './workflow_tags';

jest.mock('../../containers/configure/use_get_workflow_tags');

const useGetWorkflowTagsMock = useGetWorkflowTags as jest.Mock;

describe('WorkflowTags', () => {
  const onChange = jest.fn();
  const defaultProps = {
    isLoading: false,
    disabled: false,
    workflowTags: ['soc-triage'],
    onChange,
  };

  const getSearchInput = () =>
    within(screen.getByTestId('cases-workflow-tags')).getByRole('combobox');

  beforeEach(() => {
    jest.clearAllMocks();
    useGetWorkflowTagsMock.mockReturnValue({
      data: ['soc-triage', 'enrichment'],
      isLoading: false,
    });
  });

  it('renders the configured tags as selected options', () => {
    renderWithTestingProviders(<WorkflowTags {...defaultProps} />);

    expect(screen.getByTestId('cases-workflow-tags')).toHaveTextContent('soc-triage');
  });

  it('suggests tags returned by the workflow aggregation', async () => {
    renderWithTestingProviders(<WorkflowTags {...defaultProps} />);

    await userEvent.click(getSearchInput());

    expect(await screen.findByRole('option', { name: 'enrichment' })).toBeInTheDocument();
  });

  it('adds a suggested tag to the configured tags', async () => {
    renderWithTestingProviders(<WorkflowTags {...defaultProps} />);

    await userEvent.click(getSearchInput());
    await userEvent.click(await screen.findByRole('option', { name: 'enrichment' }));

    expect(onChange).toHaveBeenCalledWith(['soc-triage', 'enrichment']);
  });

  it('adds a trimmed custom tag that no workflow carries yet', async () => {
    renderWithTestingProviders(<WorkflowTags {...defaultProps} />);

    await userEvent.type(getSearchInput(), '  new-tag  {enter}');

    expect(onChange).toHaveBeenCalledWith(['soc-triage', 'new-tag']);
  });

  it('does not add a custom tag that is already configured', async () => {
    renderWithTestingProviders(<WorkflowTags {...defaultProps} />);

    await userEvent.type(getSearchInput(), 'soc-triage{enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not add a custom tag longer than the maximum tag length', async () => {
    renderWithTestingProviders(<WorkflowTags {...defaultProps} />);

    await userEvent.click(getSearchInput());
    await userEvent.paste('a'.repeat(MAX_LENGTH_PER_WORKFLOW_TAG + 1));
    await userEvent.keyboard('{enter}');

    expect(onChange).not.toHaveBeenCalled();
    expect(
      await screen.findByText(`Tag must be ${MAX_LENGTH_PER_WORKFLOW_TAG} characters or fewer.`)
    ).toBeInTheDocument();
  });

  it('clears the tag length error when the search value changes', async () => {
    renderWithTestingProviders(<WorkflowTags {...defaultProps} />);

    await userEvent.click(getSearchInput());
    await userEvent.paste('a'.repeat(MAX_LENGTH_PER_WORKFLOW_TAG + 1));
    await userEvent.keyboard('{enter}');
    await userEvent.keyboard('{backspace}');

    expect(
      screen.queryByText(`Tag must be ${MAX_LENGTH_PER_WORKFLOW_TAG} characters or fewer.`)
    ).not.toBeInTheDocument();
  });

  it('does not suggest workflow tags longer than the maximum tag length', async () => {
    const longTag = 'a'.repeat(MAX_LENGTH_PER_WORKFLOW_TAG + 1);
    useGetWorkflowTagsMock.mockReturnValue({
      data: ['enrichment', longTag],
      isLoading: false,
    });
    renderWithTestingProviders(<WorkflowTags {...defaultProps} />);

    await userEvent.click(getSearchInput());

    expect(await screen.findByRole('option', { name: 'enrichment' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: longTag })).not.toBeInTheDocument();
  });

  // Mounting a pill per configured tag is intrinsic to exercising the real limit, so this
  // boundary test gets more headroom than the plugin-wide budget its siblings run under.
  it('does not add a custom tag once the maximum number of tags is configured', async () => {
    const workflowTags = Array.from(
      { length: MAX_WORKFLOW_TAGS_PER_CONFIGURATION },
      (_, index) => `tag-${index}`
    );
    renderWithTestingProviders(<WorkflowTags {...defaultProps} workflowTags={workflowTags} />);

    await userEvent.click(getSearchInput());
    await userEvent.paste('one-too-many');
    await userEvent.keyboard('{enter}');

    expect(onChange).not.toHaveBeenCalled();
  }, 30_000);

  it('removes a tag when its selection is cleared', async () => {
    renderWithTestingProviders(<WorkflowTags {...defaultProps} />);

    await userEvent.click(screen.getByTestId('comboBoxClearButton'));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('does not fetch tag suggestions while disabled', () => {
    renderWithTestingProviders(<WorkflowTags {...defaultProps} disabled />);

    expect(useGetWorkflowTagsMock).toHaveBeenCalledWith({ enabled: false });
  });
});

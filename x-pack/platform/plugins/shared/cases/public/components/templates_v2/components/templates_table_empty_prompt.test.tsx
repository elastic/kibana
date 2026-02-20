/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';

import { TemplatesTableEmptyPrompt } from './templates_table_empty_prompt';
import { renderWithTestingProviders } from '../../../common/mock';

describe('TemplatesTableEmptyPrompt', () => {
  const onClearFilters = jest.fn();
  const onCreateTemplate = jest.fn();
  const createTemplateUrl = '/create-template';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when hasFilters is false (no templates exist)', () => {
    it('renders the no templates prompt', async () => {
      renderWithTestingProviders(
        <TemplatesTableEmptyPrompt
          hasFilters={false}
          onClearFilters={onClearFilters}
          onCreateTemplate={onCreateTemplate}
          createTemplateUrl={createTemplateUrl}
        />
      );

      expect(
        await screen.findByTestId('templates-table-empty-prompt-no-templates')
      ).toBeInTheDocument();
      expect(screen.getByText('You do not have any templates yet')).toBeInTheDocument();
      expect(
        screen.getByText('Create templates that automatically populate values in new cases.')
      ).toBeInTheDocument();
    });

    it('renders the create template button', async () => {
      renderWithTestingProviders(
        <TemplatesTableEmptyPrompt
          hasFilters={false}
          onClearFilters={onClearFilters}
          onCreateTemplate={onCreateTemplate}
          createTemplateUrl={createTemplateUrl}
        />
      );

      expect(await screen.findByTestId('templates-table-add-template')).toBeInTheDocument();
      expect(screen.getByText('Create template')).toBeInTheDocument();
    });

    it('calls onCreateTemplate when create button is clicked', async () => {
      renderWithTestingProviders(
        <TemplatesTableEmptyPrompt
          hasFilters={false}
          onClearFilters={onClearFilters}
          onCreateTemplate={onCreateTemplate}
          createTemplateUrl={createTemplateUrl}
        />
      );

      await userEvent.click(await screen.findByTestId('templates-table-add-template'));

      expect(onCreateTemplate).toHaveBeenCalled();
    });
  });

  describe('when hasFilters is true (no templates match filters)', () => {
    it('renders the no results prompt', async () => {
      renderWithTestingProviders(
        <TemplatesTableEmptyPrompt
          hasFilters={true}
          onClearFilters={onClearFilters}
          onCreateTemplate={onCreateTemplate}
          createTemplateUrl={createTemplateUrl}
        />
      );

      expect(
        await screen.findByTestId('templates-table-empty-prompt-no-results')
      ).toBeInTheDocument();
      expect(screen.getByText('No templates match your search criteria')).toBeInTheDocument();
      expect(screen.getByText('Try modifying your search or filters.')).toBeInTheDocument();
    });

    it('renders the clear filters button', async () => {
      renderWithTestingProviders(
        <TemplatesTableEmptyPrompt
          hasFilters={true}
          onClearFilters={onClearFilters}
          onCreateTemplate={onCreateTemplate}
          createTemplateUrl={createTemplateUrl}
        />
      );

      expect(await screen.findByTestId('templates-table-empty-clear-filters')).toBeInTheDocument();
      expect(screen.getByText('Clear filters')).toBeInTheDocument();
    });

    it('calls onClearFilters when clear filters button is clicked', async () => {
      renderWithTestingProviders(
        <TemplatesTableEmptyPrompt
          hasFilters={true}
          onClearFilters={onClearFilters}
          onCreateTemplate={onCreateTemplate}
          createTemplateUrl={createTemplateUrl}
        />
      );

      await userEvent.click(await screen.findByTestId('templates-table-empty-clear-filters'));

      expect(onClearFilters).toHaveBeenCalled();
    });

    it('does not render the create template button', async () => {
      renderWithTestingProviders(
        <TemplatesTableEmptyPrompt
          hasFilters={true}
          onClearFilters={onClearFilters}
          onCreateTemplate={onCreateTemplate}
          createTemplateUrl={createTemplateUrl}
        />
      );

      await screen.findByTestId('templates-table-empty-prompt-no-results');

      expect(screen.queryByTestId('templates-table-add-template')).not.toBeInTheDocument();
    });
  });
});

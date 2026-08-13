/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTestingProviders } from '../../../common/mock';
import { FieldLibraryMenuPanel } from './field_library_menu_panel';

const mockUseGetFieldDefinitions = jest.fn();
jest.mock('../../field_library/hooks/use_get_field_definitions', () => ({
  useGetFieldDefinitions: (args: unknown) => mockUseGetFieldDefinitions(args),
}));

// EUI selectable options set `pointer-events: none` on wrappers in jsdom; disable the check.
const user = userEvent.setup({ pointerEventsCheck: 0 });

const field = (name: string, isGlobal = false) => ({
  fieldDefinitionId: name,
  name,
  definition: '',
  owner: 'cases',
  isGlobal,
});

describe('FieldLibraryMenuPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading spinner while fetching', () => {
    mockUseGetFieldDefinitions.mockReturnValue({ data: undefined, isLoading: true });
    renderWithTestingProviders(
      <FieldLibraryMenuPanel owner="cases" existingYaml="" onSelect={jest.fn()} width={320} />
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows an empty message when there are no library fields', () => {
    mockUseGetFieldDefinitions.mockReturnValue({
      data: { fieldDefinitions: [] },
      isLoading: false,
    });
    renderWithTestingProviders(
      <FieldLibraryMenuPanel owner="cases" existingYaml="" onSelect={jest.fn()} width={320} />
    );
    expect(screen.getByText('No library fields yet')).toBeInTheDocument();
    expect(screen.getByText(/Create reusable fields in the Field library/)).toBeInTheDocument();
  });

  it('lists fields, badges globals, and calls onSelect with the chosen field name', async () => {
    mockUseGetFieldDefinitions.mockReturnValue({
      data: { fieldDefinitions: [field('root_cause'), field('impact', true)] },
      isLoading: false,
    });
    const onSelect = jest.fn();
    renderWithTestingProviders(
      <FieldLibraryMenuPanel owner="cases" existingYaml="" onSelect={onSelect} width={320} />
    );

    expect(screen.getByText('root_cause')).toBeInTheDocument();
    expect(screen.getByText('Global')).toBeInTheDocument();

    await user.click(screen.getByText('root_cause'));
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith('root_cause'));
  });

  it('disables fields already referenced by the template', () => {
    mockUseGetFieldDefinitions.mockReturnValue({
      data: { fieldDefinitions: [field('root_cause')] },
      isLoading: false,
    });
    const existingYaml = `fields:\n  - $ref: root_cause\n`;
    renderWithTestingProviders(
      <FieldLibraryMenuPanel
        owner="cases"
        existingYaml={existingYaml}
        onSelect={jest.fn()}
        width={320}
      />
    );

    const option = screen.getByRole('option', { name: /root_cause/ });
    expect(option).toHaveAttribute('aria-disabled', 'true');
  });
});

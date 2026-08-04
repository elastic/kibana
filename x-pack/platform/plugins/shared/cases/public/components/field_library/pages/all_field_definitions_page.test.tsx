/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTestingProviders } from '../../../common/mock';
import type { FieldDefinition } from '../../../../common/types/domain/field_definition/v1';
import { AllFieldDefinitionsPage } from './all_field_definitions_page';

const mockGetFieldDefinitions = jest.fn();
const mockReorderGlobalFieldDefinitions = jest.fn();

jest.mock('../hooks/use_get_field_definitions', () => ({
  useGetFieldDefinitions: () => mockGetFieldDefinitions(),
}));

jest.mock('../hooks/use_create_field_definition', () => ({
  useCreateFieldDefinition: () => ({ mutate: jest.fn(), isLoading: false }),
}));

jest.mock('../hooks/use_update_field_definition', () => ({
  useUpdateFieldDefinition: () => ({ mutate: jest.fn(), isLoading: false }),
}));

jest.mock('../hooks/use_delete_field_definition', () => ({
  useDeleteFieldDefinition: () => ({ mutate: jest.fn() }),
}));

const mockReorderState = { isLoading: false, isError: false };

jest.mock('../hooks/use_reorder_global_field_definitions', () => ({
  useReorderGlobalFieldDefinitions: () => ({
    mutate: mockReorderGlobalFieldDefinitions,
    ...mockReorderState,
  }),
}));

jest.mock('../../../common/navigation', () => ({
  useCasesTemplatesNavigation: () => ({
    getCasesTemplatesUrl: () => '/templates',
    navigateToCasesTemplates: jest.fn(),
  }),
}));

const buildFieldDefinition = (overrides: Partial<FieldDefinition>): FieldDefinition => ({
  fieldDefinitionId: 'id-1',
  name: 'my_field',
  definition: 'name: my_field\ncontrol: INPUT_TEXT\ntype: keyword\n',
  owner: 'securitySolution',
  ...overrides,
});

describe('AllFieldDefinitionsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReorderState.isLoading = false;
    mockReorderState.isError = false;
    mockGetFieldDefinitions.mockReturnValue({ data: { fieldDefinitions: [] }, isLoading: false });
  });

  it('reorders global fields from their Field Library actions', async () => {
    const firstField = buildFieldDefinition({
      fieldDefinitionId: 'first',
      name: 'first_field',
      isGlobal: true,
      displayOrder: 0,
    });
    const secondField = buildFieldDefinition({
      fieldDefinitionId: 'second',
      name: 'second_field',
      isGlobal: true,
      displayOrder: 1,
    });
    mockGetFieldDefinitions.mockReturnValue({
      data: { fieldDefinitions: [secondField, firstField] },
      isLoading: false,
    });

    renderWithTestingProviders(<AllFieldDefinitionsPage />);

    // Move up/down live in each row's actions menu as the pointer-free path alongside dragging.
    // The first row offers no "Move up" at all rather than a disabled one.
    await userEvent.click(screen.getByTestId('fieldDefinitionActionsButton-first_field'));
    expect(screen.queryByTestId('fieldDefinitionMoveUpButton')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('fieldDefinitionMoveDownButton'));

    expect(mockReorderGlobalFieldDefinitions).toHaveBeenCalledWith([
      expect.objectContaining({ fieldDefinitionId: 'second', displayOrder: 0 }),
      expect.objectContaining({ fieldDefinitionId: 'first', displayOrder: 1 }),
    ]);
  });

  it('rolls the optimistic order back to the server order when the reorder write fails', async () => {
    const firstField = buildFieldDefinition({
      fieldDefinitionId: 'first',
      name: 'first_field',
      isGlobal: true,
      displayOrder: 0,
    });
    const secondField = buildFieldDefinition({
      fieldDefinitionId: 'second',
      name: 'second_field',
      isGlobal: true,
      displayOrder: 1,
    });
    mockGetFieldDefinitions.mockReturnValue({
      data: { fieldDefinitions: [firstField, secondField] },
      isLoading: false,
    });

    const { rerender } = renderWithTestingProviders(<AllFieldDefinitionsPage />);

    await userEvent.click(screen.getByTestId('fieldDefinitionActionsButton-first_field'));
    await userEvent.click(screen.getByTestId('fieldDefinitionMoveDownButton'));

    // Optimistic: the moved field is shown last before the write resolves.
    const optimisticOrder = screen
      .getAllByTestId(/^fieldDefinitionRow-/)
      .map((row) => row.getAttribute('data-test-subj'));
    expect(optimisticOrder).toEqual([
      'fieldDefinitionRow-second_field',
      'fieldDefinitionRow-first_field',
    ]);

    // The write fails and the server order never changes, so the list must go back to the truth
    // rather than keep showing an order that was never persisted.
    mockReorderState.isError = true;
    rerender(<AllFieldDefinitionsPage />);

    const rolledBackOrder = screen
      .getAllByTestId(/^fieldDefinitionRow-/)
      .map((row) => row.getAttribute('data-test-subj'));
    expect(rolledBackOrder).toEqual([
      'fieldDefinitionRow-first_field',
      'fieldDefinitionRow-second_field',
    ]);
  });

  it('gives every row and both group headers identical column tracks', () => {
    mockGetFieldDefinitions.mockReturnValue({
      data: {
        fieldDefinitions: [
          // A required field and an unrequired one: the badge cell has content in one row and not
          // the other, which is exactly what used to knock the columns out of alignment.
          buildFieldDefinition({
            fieldDefinitionId: 'required',
            name: 'sla_minutes',
            isGlobal: true,
            definition:
              'name: sla_minutes\ncontrol: INPUT_NUMBER\ntype: long\nvalidation:\n  required: true\n',
          }),
          buildFieldDefinition({
            fieldDefinitionId: 'optional',
            name: 'affected_users',
            isGlobal: true,
            definition: 'name: affected_users\ncontrol: INPUT_NUMBER\ntype: long\n',
          }),
          buildFieldDefinition({ fieldDefinitionId: 'template_only', name: 'my_users' }),
        ],
      },
      isLoading: false,
    });

    renderWithTestingProviders(<AllFieldDefinitionsPage />);

    const tracks = [
      ...screen.getAllByTestId('fieldDefinitionRowHeader'),
      ...screen.getAllByTestId(/^fieldDefinitionRow-/),
    ].map(
      (element) =>
        element.style.gridTemplateColumns || getComputedStyle(element).gridTemplateColumns
    );

    // Every track definition must be content-independent, so all rows resolve to the same columns.
    expect(new Set(tracks).size).toBe(1);
    expect(tracks[0]).not.toContain('auto');
  });

  it("shows the field's label parsed from its definition YAML", () => {
    mockGetFieldDefinitions.mockReturnValue({
      data: {
        fieldDefinitions: [
          buildFieldDefinition({
            fieldDefinitionId: 'labeled',
            name: 'summary',
            definition: 'name: summary\nlabel: Summary\ncontrol: INPUT_TEXT\ntype: keyword\n',
          }),
        ],
      },
      isLoading: false,
    });

    renderWithTestingProviders(<AllFieldDefinitionsPage />);

    // The row leads with the label and carries the raw name beneath it, so both are present.
    const row = screen.getByTestId('fieldDefinitionRow-summary');
    expect(within(row).getByText('Summary')).toBeInTheDocument();
    expect(within(row).getByText('summary')).toBeInTheDocument();
  });

  it('falls back to the field name when the definition has no label', () => {
    mockGetFieldDefinitions.mockReturnValue({
      data: {
        fieldDefinitions: [
          buildFieldDefinition({
            definition: 'name: my_field\ncontrol: INPUT_TEXT\ntype: keyword\n',
          }),
        ],
      },
      isLoading: false,
    });

    renderWithTestingProviders(<AllFieldDefinitionsPage />);

    // No placeholder dash: an unlabelled field falls back to its name rather than rendering
    // an empty-looking cell.
    expect(
      within(screen.getByTestId('fieldDefinitionRow-my_field')).getAllByText('my_field').length
    ).toBeGreaterThan(0);
  });

  describe('Required column', () => {
    const renderWithDefinition = (definition: string) => {
      mockGetFieldDefinitions.mockReturnValue({
        data: { fieldDefinitions: [buildFieldDefinition({ definition })] },
        isLoading: false,
      });
      renderWithTestingProviders(<AllFieldDefinitionsPage />);
    };

    it('shows the Required badge when validation.required is true', () => {
      renderWithDefinition(
        'name: my_field\ncontrol: INPUT_TEXT\ntype: keyword\nvalidation:\n  required: true\n'
      );

      expect(screen.getByTestId('fieldDefinitionRequiredBadge')).toHaveTextContent('Required');
      expect(screen.queryByTestId('fieldDefinitionRequiredOnCloseBadge')).not.toBeInTheDocument();
    });

    it('shows the Required on close badge when validation.required_on_close is true', () => {
      renderWithDefinition(
        'name: my_field\ncontrol: INPUT_TEXT\ntype: keyword\nvalidation:\n  required_on_close: true\n'
      );

      expect(screen.getByTestId('fieldDefinitionRequiredOnCloseBadge')).toHaveTextContent(
        'Required on close'
      );
      expect(screen.queryByTestId('fieldDefinitionRequiredBadge')).not.toBeInTheDocument();
    });

    it('shows both badges when both flags are set', () => {
      renderWithDefinition(
        'name: my_field\ncontrol: INPUT_TEXT\ntype: keyword\nvalidation:\n  required: true\n  required_on_close: true\n'
      );

      expect(screen.getByTestId('fieldDefinitionRequiredBadge')).toBeInTheDocument();
      expect(screen.getByTestId('fieldDefinitionRequiredOnCloseBadge')).toBeInTheDocument();
    });

    // No placeholder dash any more: an optional field simply carries no requirement badge,
    // which is the absence of a marker rather than a marker meaning "none".
    it('shows no badge when neither flag is set (including required: false)', () => {
      renderWithDefinition(
        'name: my_field\ncontrol: INPUT_TEXT\ntype: keyword\nvalidation:\n  required: false\n'
      );

      expect(screen.queryByTestId('fieldDefinitionRequiredBadge')).not.toBeInTheDocument();
      expect(screen.queryByTestId('fieldDefinitionRequiredOnCloseBadge')).not.toBeInTheDocument();
    });

    it('shows no badge for a malformed definition', () => {
      renderWithDefinition('control: [ {oops');

      expect(screen.getByTestId('fieldDefinitionRow-my_field')).toBeInTheDocument();
      expect(screen.queryByTestId('fieldDefinitionRequiredBadge')).not.toBeInTheDocument();
    });
  });
});

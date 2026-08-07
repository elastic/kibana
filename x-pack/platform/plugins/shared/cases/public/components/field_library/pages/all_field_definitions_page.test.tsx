/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import { renderWithTestingProviders } from '../../../common/mock';
import type { FieldDefinition } from '../../../../common/types/domain/field_definition/v1';
import { AllFieldDefinitionsPage } from './all_field_definitions_page';

const mockGetFieldDefinitions = jest.fn();

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
    mockGetFieldDefinitions.mockReturnValue({ data: { fieldDefinitions: [] }, isLoading: false });
  });

  it('renders the Label column immediately after the Name column', () => {
    renderWithTestingProviders(<AllFieldDefinitionsPage />);

    const headerCells = screen.getAllByRole('columnheader').map((cell) => cell.textContent);

    expect(headerCells[0]).toContain('Name');
    expect(headerCells[1]).toContain('Label');
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

    expect(
      within(screen.getByTestId('fieldDefinitionLabelCell')).getByText('Summary')
    ).toBeInTheDocument();
  });

  it('falls back to a placeholder when the definition has no label', () => {
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

    expect(
      within(screen.getByTestId('fieldDefinitionLabelCell')).getByText('—')
    ).toBeInTheDocument();
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

    it('shows a placeholder when neither flag is set (including required: false)', () => {
      renderWithDefinition(
        'name: my_field\ncontrol: INPUT_TEXT\ntype: keyword\nvalidation:\n  required: false\n'
      );

      expect(
        within(screen.getByTestId('fieldDefinitionRequiredCell')).getByText('—')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('fieldDefinitionRequiredBadge')).not.toBeInTheDocument();
    });

    it('shows a placeholder for a malformed definition', () => {
      renderWithDefinition('control: [ {oops');

      expect(
        within(screen.getByTestId('fieldDefinitionRequiredCell')).getByText('—')
      ).toBeInTheDocument();
    });
  });
});

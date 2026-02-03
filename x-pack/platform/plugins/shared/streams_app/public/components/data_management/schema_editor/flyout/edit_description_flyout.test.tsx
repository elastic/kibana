/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EditDescriptionFlyout } from './edit_description_flyout';
import type { MappedSchemaField, UnmappedSchemaField } from '../types';

const renderWithIntl = (component: React.ReactElement) => {
  return render(<IntlProvider>{component}</IntlProvider>);
};

describe('EditDescriptionFlyout', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  const defaultProps = {
    onClose: mockOnClose,
    onSave: mockOnSave,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saving description on mapped fields', () => {
    it('should preserve mapped status when editing description on a mapped field', async () => {
      const mappedField: MappedSchemaField = {
        name: 'message',
        parent: 'logs',
        status: 'mapped',
        type: 'keyword',
      };

      renderWithIntl(<EditDescriptionFlyout {...defaultProps} field={mappedField} />);

      const textArea = screen.getByTestId('streamsAppEditDescriptionFlyoutTextArea');
      await userEvent.clear(textArea);
      await userEvent.type(textArea, 'A test description');

      const saveButton = screen.getByTestId('streamsAppEditDescriptionFlyoutSaveButton');
      await userEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'message',
        parent: 'logs',
        status: 'mapped',
        type: 'keyword',
        description: 'A test description',
      });
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should preserve existing description when editing a mapped field with description', async () => {
      const mappedField: MappedSchemaField = {
        name: 'message',
        parent: 'logs',
        status: 'mapped',
        type: 'keyword',
        description: 'Old description',
      };

      renderWithIntl(<EditDescriptionFlyout {...defaultProps} field={mappedField} />);

      const textArea = screen.getByTestId('streamsAppEditDescriptionFlyoutTextArea');
      expect(textArea).toHaveValue('Old description');

      await userEvent.clear(textArea);
      await userEvent.type(textArea, 'Updated description');

      const saveButton = screen.getByTestId('streamsAppEditDescriptionFlyoutSaveButton');
      await userEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'message',
        parent: 'logs',
        status: 'mapped',
        type: 'keyword',
        description: 'Updated description',
      });
    });
  });

  describe('saving description on unmapped fields', () => {
    it('should convert unmapped field to mapped with type "unmapped" when saving description', async () => {
      const unmappedField: UnmappedSchemaField = {
        name: 'custom_field',
        parent: 'logs',
        status: 'unmapped',
      };

      renderWithIntl(<EditDescriptionFlyout {...defaultProps} field={unmappedField} />);

      const textArea = screen.getByTestId('streamsAppEditDescriptionFlyoutTextArea');
      await userEvent.type(textArea, 'Documentation for this unmapped field');

      const saveButton = screen.getByTestId('streamsAppEditDescriptionFlyoutSaveButton');
      await userEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'custom_field',
        parent: 'logs',
        status: 'mapped',
        type: 'unmapped',
        description: 'Documentation for this unmapped field',
      });
    });

    it('should preserve existing type when unmapped field already has a type', async () => {
      const unmappedField: UnmappedSchemaField = {
        name: 'custom_field',
        parent: 'logs',
        status: 'unmapped',
        type: 'keyword',
      };

      renderWithIntl(<EditDescriptionFlyout {...defaultProps} field={unmappedField} />);

      const textArea = screen.getByTestId('streamsAppEditDescriptionFlyoutTextArea');
      await userEvent.type(textArea, 'Field description');

      const saveButton = screen.getByTestId('streamsAppEditDescriptionFlyoutSaveButton');
      await userEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'custom_field',
        parent: 'logs',
        status: 'mapped',
        type: 'keyword',
        description: 'Field description',
      });
    });

    it('should convert unmapped field to mapped even when saving empty description', async () => {
      const unmappedField: UnmappedSchemaField = {
        name: 'custom_field',
        parent: 'logs',
        status: 'unmapped',
      };

      renderWithIntl(<EditDescriptionFlyout {...defaultProps} field={unmappedField} />);

      // Don't type anything, just save
      const saveButton = screen.getByTestId('streamsAppEditDescriptionFlyoutSaveButton');
      await userEvent.click(saveButton);

      // Should still convert to mapped with type: 'unmapped', description becomes undefined
      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'custom_field',
        parent: 'logs',
        status: 'mapped',
        type: 'unmapped',
        description: undefined,
      });
    });
  });

  describe('saving description on inherited fields', () => {
    it('should convert inherited field to mapped when saving description (creates override)', async () => {
      const inheritedField: MappedSchemaField = {
        name: 'inherited_field',
        parent: 'parent_stream',
        status: 'inherited',
        type: 'keyword',
      };

      renderWithIntl(<EditDescriptionFlyout {...defaultProps} field={inheritedField} />);

      // Should show the inherited callout
      expect(
        screen.getByText(
          "Setting a description on an inherited field will create an override in this stream. The field's type and format will remain inherited from the parent."
        )
      ).toBeInTheDocument();

      const textArea = screen.getByTestId('streamsAppEditDescriptionFlyoutTextArea');
      await userEvent.type(textArea, 'Override description');

      const saveButton = screen.getByTestId('streamsAppEditDescriptionFlyoutSaveButton');
      await userEvent.click(saveButton);

      // Inherited fields should be converted to 'mapped' status so they get saved to the server
      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'inherited_field',
        parent: 'parent_stream',
        status: 'mapped',
        type: 'keyword',
        description: 'Override description',
      });
    });
  });

  describe('cancel button', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const field: MappedSchemaField = {
        name: 'test',
        parent: 'logs',
        status: 'mapped',
        type: 'keyword',
      };

      renderWithIntl(<EditDescriptionFlyout {...defaultProps} field={field} />);

      const cancelButton = screen.getByTestId('streamsAppEditDescriptionFlyoutCancelButton');
      await userEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });
});

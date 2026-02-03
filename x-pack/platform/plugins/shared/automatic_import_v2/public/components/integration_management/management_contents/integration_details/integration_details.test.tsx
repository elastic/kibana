/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { IntegrationDetails } from './integration_details';
import { IntegrationFormProvider } from '../../forms/integration_form';
import { MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH } from '../../forms/constants';

const mockExistingPackageNames = ['existing_integration', 'my_custom_package', 'test_package'];

jest.mock('../../../../../common/lib/api', () => ({
  getInstalledPackages: jest.fn(() =>
    Promise.resolve({
      items: mockExistingPackageNames.map((id) => ({ id })),
    })
  ),
}));

const mockServices = coreMock.createStart();

const TestWrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const mockOnSubmit = jest.fn();
  return (
    <I18nProvider>
      <KibanaContextProvider services={mockServices}>
        <IntegrationFormProvider onSubmit={mockOnSubmit}>{children}</IntegrationFormProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
};

const renderIntegrationDetails = () => {
  return render(<IntegrationDetails />, { wrapper: TestWrapper });
};

describe('IntegrationDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render title input field', () => {
      const { getByTestId } = renderIntegrationDetails();
      expect(getByTestId('integrationTitleInput')).toBeInTheDocument();
    });

    it('should render description input field', () => {
      const { getByTestId } = renderIntegrationDetails();
      expect(getByTestId('integrationDescriptionInput')).toBeInTheDocument();
    });

    it('should render logo file picker', () => {
      const { getByTestId } = renderIntegrationDetails();
      expect(getByTestId('integrationLogoFilePicker')).toBeInTheDocument();
    });
  });

  describe('title field interactions', () => {
    it('should update title value when typing', async () => {
      const { getByTestId } = renderIntegrationDetails();
      const titleInput = getByTestId('integrationTitleInput') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(titleInput, { target: { value: 'My New Integration' } });
      });

      expect(titleInput.value).toBe('My New Integration');
    });

    it('should show required error when title is empty and field is touched', async () => {
      const { getByTestId, findByText } = renderIntegrationDetails();
      const titleInput = getByTestId('integrationTitleInput');

      // Type something then clear it to trigger validation
      await act(async () => {
        fireEvent.change(titleInput, { target: { value: 'test' } });
      });
      await act(async () => {
        fireEvent.change(titleInput, { target: { value: '' } });
      });
      await act(async () => {
        fireEvent.blur(titleInput);
      });

      const errorMessage = await findByText('Integration name is required');
      expect(errorMessage).toBeInTheDocument();
    });

    it('should show max length error when title exceeds limit', async () => {
      const { getByTestId, findByText } = renderIntegrationDetails();
      const titleInput = getByTestId('integrationTitleInput');
      const longTitle = 'a'.repeat(MAX_NAME_LENGTH + 1);

      await act(async () => {
        fireEvent.change(titleInput, { target: { value: longTitle } });
      });
      await act(async () => {
        fireEvent.blur(titleInput);
      });

      const errorMessage = await findByText(
        `Integration name must be no more than ${MAX_NAME_LENGTH} characters`
      );
      expect(errorMessage).toBeInTheDocument();
    });

    it('should show duplicate error when title matches existing package name', async () => {
      const { getByTestId, findByText } = renderIntegrationDetails();

      // Wait for the packageNames to be loaded from the mocked API
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const titleInput = getByTestId('integrationTitleInput');

      // Type a name that matches an existing package (exact match)
      await act(async () => {
        fireEvent.change(titleInput, { target: { value: 'existing_integration' } });
      });
      await act(async () => {
        fireEvent.blur(titleInput);
      });

      const errorMessage = await findByText('An integration with this name already exists');
      expect(errorMessage).toBeInTheDocument();
    });
  });

  describe('description field interactions', () => {
    it('should update description value when typing', async () => {
      const { getByTestId } = renderIntegrationDetails();
      const descriptionInput = getByTestId('integrationDescriptionInput') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(descriptionInput, { target: { value: 'This is my integration' } });
      });

      expect(descriptionInput.value).toBe('This is my integration');
    });

    it('should show required error when description is empty and field is touched', async () => {
      const { getByTestId, findByText } = renderIntegrationDetails();
      const descriptionInput = getByTestId('integrationDescriptionInput');

      // Type something then clear it to trigger validation
      await act(async () => {
        fireEvent.change(descriptionInput, { target: { value: 'test' } });
      });
      await act(async () => {
        fireEvent.change(descriptionInput, { target: { value: '' } });
      });
      await act(async () => {
        fireEvent.blur(descriptionInput);
      });

      const errorMessage = await findByText('Description is required');
      expect(errorMessage).toBeInTheDocument();
    });

    it('should show max length error when description exceeds limit', async () => {
      const { getByTestId, findByText } = renderIntegrationDetails();
      const descriptionInput = getByTestId('integrationDescriptionInput');
      const longDescription = 'a'.repeat(MAX_DESCRIPTION_LENGTH + 1);

      await act(async () => {
        fireEvent.change(descriptionInput, { target: { value: longDescription } });
      });
      await act(async () => {
        fireEvent.blur(descriptionInput);
      });

      const errorMessage = await findByText(
        `Description must be no more than ${MAX_DESCRIPTION_LENGTH} characters`
      );
      expect(errorMessage).toBeInTheDocument();
    });
  });

  describe('logo file picker interactions', () => {
    it('should show error for non-SVG files', async () => {
      const { getByTestId, findByText } = renderIntegrationDetails();
      const fileInput = getByTestId('integrationLogoFilePicker') as HTMLInputElement;

      const pngFile = new File(['test'], 'logo.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [pngFile] } });
      });

      const errorMessage = await findByText('Only SVG files are allowed');
      expect(errorMessage).toBeInTheDocument();
    });

    it('should show error for files exceeding size limit', async () => {
      const { getByTestId, findByText } = renderIntegrationDetails();
      const fileInput = getByTestId('integrationLogoFilePicker') as HTMLInputElement;

      // Create a file larger than 1MB
      const largeContent = 'x'.repeat(1024 * 1024 + 1);
      const largeFile = new File([largeContent], 'large-logo.svg', { type: 'image/svg+xml' });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [largeFile] } });
      });

      const errorMessage = await findByText(/large-logo\.svg is too large/);
      expect(errorMessage).toBeInTheDocument();
    });

    it('should accept valid SVG files', async () => {
      const { getByTestId, queryByText } = renderIntegrationDetails();
      const fileInput = getByTestId('integrationLogoFilePicker') as HTMLInputElement;

      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
      const svgFile = new File([svgContent], 'logo.svg', { type: 'image/svg+xml' });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [svgFile] } });
      });

      // Should not show any error messages for valid SVG
      await waitFor(() => {
        expect(queryByText('Only SVG files are allowed')).not.toBeInTheDocument();
        expect(queryByText(/is too large/)).not.toBeInTheDocument();
      });
    });
  });
});

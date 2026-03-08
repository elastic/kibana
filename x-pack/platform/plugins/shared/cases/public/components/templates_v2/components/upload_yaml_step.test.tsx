/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UploadYamlStep } from './upload_yaml_step';
import { useValidateYaml } from '../hooks/use_validate_yaml';
import type { ValidatedFile, FileValidationError } from '../hooks/use_validate_yaml';

jest.mock('../hooks/use_validate_yaml');

const mockUseValidateYaml = useValidateYaml as jest.MockedFunction<typeof useValidateYaml>;

describe('UploadYamlStep', () => {
  const mockOnValidationStart = jest.fn();
  const mockOnValidationComplete = jest.fn();
  const mockValidateFiles = jest.fn();

  const mockValidatedFile: ValidatedFile = {
    file: new File(['name: Test\nfields: []'], 'template.yaml', { type: 'application/x-yaml' }),
    documents: [{ name: 'Test', fields: [] }],
  };

  const mockValidationError: FileValidationError = {
    fileName: 'error.yaml',
    message: 'Invalid YAML format',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseValidateYaml.mockReturnValue({
      validateFiles: mockValidateFiles,
    });
  });

  it('renders the file picker', () => {
    render(
      <UploadYamlStep
        validatedFiles={[]}
        validationErrors={[]}
        isValidating={false}
        onValidationStart={mockOnValidationStart}
        onValidationComplete={mockOnValidationComplete}
      />
    );

    expect(screen.getByTestId('template-flyout-file-picker')).toBeInTheDocument();
  });

  it('shows loading state when validating', () => {
    render(
      <UploadYamlStep
        validatedFiles={[]}
        validationErrors={[]}
        isValidating
        onValidationStart={mockOnValidationStart}
        onValidationComplete={mockOnValidationComplete}
      />
    );

    expect(screen.getByTestId('template-flyout-file-picker')).toBeInTheDocument();
  });

  it('displays validation errors when present', () => {
    render(
      <UploadYamlStep
        validatedFiles={[]}
        validationErrors={[mockValidationError]}
        isValidating={false}
        onValidationStart={mockOnValidationStart}
        onValidationComplete={mockOnValidationComplete}
      />
    );

    expect(screen.getByTestId('template-flyout-validation-errors')).toBeInTheDocument();
    expect(screen.getByText('Invalid YAML format')).toBeInTheDocument();
  });

  it('displays success message when files are validated', () => {
    render(
      <UploadYamlStep
        validatedFiles={[mockValidatedFile]}
        validationErrors={[]}
        isValidating={false}
        onValidationStart={mockOnValidationStart}
        onValidationComplete={mockOnValidationComplete}
      />
    );

    expect(screen.getByTestId('template-flyout-validation-success')).toBeInTheDocument();
  });

  it('calls validation callbacks when files are selected', async () => {
    mockValidateFiles.mockResolvedValue({
      validFiles: [mockValidatedFile],
      errors: [],
    });

    render(
      <UploadYamlStep
        validatedFiles={[]}
        validationErrors={[]}
        isValidating={false}
        onValidationStart={mockOnValidationStart}
        onValidationComplete={mockOnValidationComplete}
      />
    );

    const file = new File(['name: Test'], 'test.yaml', { type: 'application/x-yaml' });
    const input = screen.getByTestId('template-flyout-file-picker');

    await userEvent.upload(input, file);

    await waitFor(
      () => {
        expect(mockOnValidationStart).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );

    await waitFor(
      () => {
        expect(mockValidateFiles).toHaveBeenCalledWith([file]);
      },
      { timeout: 1000 }
    );

    await waitFor(
      () => {
        expect(mockOnValidationComplete).toHaveBeenCalledWith({
          validFiles: [mockValidatedFile],
          errors: [],
        });
      },
      { timeout: 1000 }
    );
  });

  it('handles empty file selection', () => {
    render(
      <UploadYamlStep
        validatedFiles={[]}
        validationErrors={[]}
        isValidating={false}
        onValidationStart={mockOnValidationStart}
        onValidationComplete={mockOnValidationComplete}
      />
    );

    expect(screen.getByTestId('template-flyout-file-picker')).toBeInTheDocument();
    expect(mockOnValidationStart).not.toHaveBeenCalled();
    expect(mockValidateFiles).not.toHaveBeenCalled();
  });

  it('handles multiple file selection', async () => {
    const files = [
      new File(['name: Test1'], 'test1.yaml', { type: 'application/x-yaml' }),
      new File(['name: Test2'], 'test2.yaml', { type: 'application/x-yaml' }),
    ];

    mockValidateFiles.mockResolvedValue({
      validFiles: [mockValidatedFile],
      errors: [],
    });

    render(
      <UploadYamlStep
        validatedFiles={[]}
        validationErrors={[]}
        isValidating={false}
        onValidationStart={mockOnValidationStart}
        onValidationComplete={mockOnValidationComplete}
      />
    );

    const input = screen.getByTestId('template-flyout-file-picker');

    await userEvent.upload(input, files);

    await waitFor(
      () => {
        expect(mockValidateFiles).toHaveBeenCalledWith(files);
      },
      { timeout: 1000 }
    );
  });

  it('displays multiple validation errors', () => {
    const errors: FileValidationError[] = [
      { fileName: 'error1.yaml', message: 'Error 1' },
      { fileName: 'error2.yaml', message: 'Error 2' },
    ];

    render(
      <UploadYamlStep
        validatedFiles={[]}
        validationErrors={errors}
        isValidating={false}
        onValidationStart={mockOnValidationStart}
        onValidationComplete={mockOnValidationComplete}
      />
    );

    expect(screen.getByText('Error 1')).toBeInTheDocument();
    expect(screen.getByText('Error 2')).toBeInTheDocument();
  });

  it('accepts only .yaml and .yml files', () => {
    render(
      <UploadYamlStep
        validatedFiles={[]}
        validationErrors={[]}
        isValidating={false}
        onValidationStart={mockOnValidationStart}
        onValidationComplete={mockOnValidationComplete}
      />
    );

    const input = screen.getByTestId('template-flyout-file-picker');
    expect(input).toHaveAttribute('accept', '.yaml,.yml');
  });

  it('allows multiple file selection', () => {
    render(
      <UploadYamlStep
        validatedFiles={[]}
        validationErrors={[]}
        isValidating={false}
        onValidationStart={mockOnValidationStart}
        onValidationComplete={mockOnValidationComplete}
      />
    );

    const input = screen.getByTestId('template-flyout-file-picker');
    expect(input).toHaveAttribute('multiple');
  });
});

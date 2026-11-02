/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateFlyout } from './template_flyout';
import { useParseYaml } from '../hooks/use_parse_yaml';
import { useImportTemplates } from '../hooks/use_import_templates';
import { useImportSteps, ImportStep } from '../hooks/use_import_steps';

jest.mock('../hooks/use_parse_yaml');
jest.mock('../hooks/use_import_templates');
jest.mock('../hooks/use_import_steps');
jest.mock('./upload_yaml_step', () => ({
  UploadYamlStep: ({
    onValidationComplete,
  }: {
    onValidationComplete: (result: { validFiles: unknown[]; errors: unknown[] }) => void;
  }) => (
    <div data-test-subj="upload-yaml-step">
      <button
        type="button"
        onClick={() =>
          onValidationComplete({
            validFiles: [{ fileName: 'test.yaml', content: 'name: Test' }],
            errors: [],
          })
        }
      >
        {'Mock Upload'}
      </button>
    </div>
  ),
}));
jest.mock('./select_templates_step', () => ({
  SelectTemplatesStep: ({
    onSelectionChange,
    onRowClick,
  }: {
    onSelectionChange: (templates: unknown[]) => void;
    onRowClick: (template: unknown) => void;
  }) => (
    <div data-test-subj="select-templates-step">
      <button
        type="button"
        onClick={() =>
          onSelectionChange([
            {
              name: 'Test',
              sourceFileName: 'test.yaml',
              documentIndex: 0,
              existsOnServer: false,
            },
          ])
        }
      >
        {'Mock Select'}
      </button>
      <button
        type="button"
        onClick={() =>
          onRowClick({
            name: 'Test',
            sourceFileName: 'test.yaml',
            documentIndex: 0,
            existsOnServer: false,
          })
        }
      >
        {'Mock Row Click'}
      </button>
    </div>
  ),
}));
jest.mock('./template_flyout_header', () => ({
  TemplateFlyoutHeader: () => <div data-test-subj="template-flyout-header" />,
}));
jest.mock('./template_flyout_footer', () => ({
  TemplateFlyoutFooter: ({
    onNext,
    onImport,
    onBack,
    onCancel,
  }: {
    onNext: () => void;
    onImport: () => void;
    onBack: () => void;
    onCancel: () => void;
  }) => (
    <div data-test-subj="template-flyout-footer">
      <button type="button" onClick={onCancel}>
        {'Cancel'}
      </button>
      <button type="button" onClick={onBack}>
        {'Back'}
      </button>
      <button type="button" onClick={onNext}>
        {'Next'}
      </button>
      <button type="button" onClick={onImport}>
        {'Import'}
      </button>
    </div>
  ),
}));
jest.mock('./template_preview_panel', () => ({
  TemplatePreviewPanel: ({ onClose }: { onClose: () => void }) => (
    <div data-test-subj="template-preview-panel">
      <button type="button" onClick={onClose}>
        {'Close Preview'}
      </button>
    </div>
  ),
}));

const mockUseParseYaml = useParseYaml as jest.MockedFunction<typeof useParseYaml>;
const mockUseImportTemplates = useImportTemplates as jest.MockedFunction<typeof useImportTemplates>;
const mockUseImportSteps = useImportSteps as jest.MockedFunction<typeof useImportSteps>;

describe('TemplateFlyout', () => {
  const mockOnClose = jest.fn();
  const mockOnImport = jest.fn();
  const mockParseFiles = jest.fn();
  const mockImportTemplates = jest.fn();
  const mockGoToStep = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseParseYaml.mockReturnValue({
      parseFiles: mockParseFiles,
    });

    mockUseImportTemplates.mockReturnValue({
      importTemplates: mockImportTemplates,
      isImporting: false,
    });

    mockUseImportSteps.mockReturnValue({
      currentStep: ImportStep.UploadYaml,
      horizontalSteps: [],
      isFirstStep: true,
      isLastStep: false,
      goToStep: mockGoToStep,
    });

    mockParseFiles.mockResolvedValue({
      templates: [
        {
          name: 'Test Template',
          sourceFileName: 'test.yaml',
          documentIndex: 0,
          existsOnServer: false,
        },
      ],
      errors: [],
    });

    mockImportTemplates.mockResolvedValue({
      succeeded: 1,
      failed: 0,
    });
  });

  it('renders the flyout', () => {
    render(<TemplateFlyout onClose={mockOnClose} onImport={mockOnImport} />);

    expect(screen.getByTestId('template-flyout')).toBeInTheDocument();
  });

  it('renders the header', () => {
    render(<TemplateFlyout onClose={mockOnClose} onImport={mockOnImport} />);

    expect(screen.getByTestId('template-flyout-header')).toBeInTheDocument();
  });

  it('renders the footer', () => {
    render(<TemplateFlyout onClose={mockOnClose} onImport={mockOnImport} />);

    expect(screen.getByTestId('template-flyout-footer')).toBeInTheDocument();
  });

  it('renders upload step initially', () => {
    render(<TemplateFlyout onClose={mockOnClose} onImport={mockOnImport} />);

    expect(screen.getByTestId('upload-yaml-step')).toBeInTheDocument();
  });

  it('renders select step when currentStep is SelectTemplates', () => {
    mockUseImportSteps.mockReturnValue({
      currentStep: ImportStep.SelectTemplates,
      horizontalSteps: [],
      isFirstStep: false,
      isLastStep: true,
      goToStep: mockGoToStep,
    });

    render(<TemplateFlyout onClose={mockOnClose} onImport={mockOnImport} />);

    expect(screen.getByTestId('template-flyout-step-select')).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', async () => {
    render(<TemplateFlyout onClose={mockOnClose} onImport={mockOnImport} />);

    await userEvent.click(screen.getByText('Cancel'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('parses files and navigates to select step when next is clicked', async () => {
    render(<TemplateFlyout onClose={mockOnClose} onImport={mockOnImport} />);

    await userEvent.click(screen.getByText('Mock Upload'));
    await userEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(mockParseFiles).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockGoToStep).toHaveBeenCalledWith(ImportStep.SelectTemplates);
    });
  });

  it('imports templates and calls onImport when import succeeds', async () => {
    mockUseImportSteps.mockReturnValue({
      currentStep: ImportStep.SelectTemplates,
      horizontalSteps: [],
      isFirstStep: false,
      isLastStep: true,
      goToStep: mockGoToStep,
    });

    render(<TemplateFlyout onClose={mockOnClose} onImport={mockOnImport} />);

    await userEvent.click(screen.getByText('Mock Select'));
    await userEvent.click(screen.getByText('Import'));

    await waitFor(() => {
      expect(mockImportTemplates).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockOnImport).toHaveBeenCalledTimes(1);
    });
  });

  it('does not call onImport when import fails', async () => {
    mockImportTemplates.mockResolvedValue({
      succeeded: 0,
      failed: 1,
    });

    mockUseImportSteps.mockReturnValue({
      currentStep: ImportStep.SelectTemplates,
      horizontalSteps: [],
      isFirstStep: false,
      isLastStep: true,
      goToStep: mockGoToStep,
    });

    render(<TemplateFlyout onClose={mockOnClose} onImport={mockOnImport} />);

    await userEvent.click(screen.getByText('Mock Select'));
    await userEvent.click(screen.getByText('Import'));

    await waitFor(() => {
      expect(mockImportTemplates).toHaveBeenCalled();
    });

    expect(mockOnImport).not.toHaveBeenCalled();
  });

  it('opens preview panel when row is clicked', async () => {
    mockUseImportSteps.mockReturnValue({
      currentStep: ImportStep.SelectTemplates,
      horizontalSteps: [],
      isFirstStep: false,
      isLastStep: true,
      goToStep: mockGoToStep,
    });

    render(<TemplateFlyout onClose={mockOnClose} onImport={mockOnImport} />);

    await userEvent.click(screen.getByText('Mock Row Click'));

    expect(screen.getByTestId('template-preview-panel')).toBeInTheDocument();
  });

  it('closes preview panel when close is clicked', async () => {
    mockUseImportSteps.mockReturnValue({
      currentStep: ImportStep.SelectTemplates,
      horizontalSteps: [],
      isFirstStep: false,
      isLastStep: true,
      goToStep: mockGoToStep,
    });

    render(<TemplateFlyout onClose={mockOnClose} onImport={mockOnImport} />);

    await userEvent.click(screen.getByText('Mock Row Click'));
    expect(screen.getByTestId('template-preview-panel')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Close Preview'));
    expect(screen.queryByTestId('template-preview-panel')).not.toBeInTheDocument();
  });

  it('toggles preview panel when same row is clicked twice', async () => {
    mockUseImportSteps.mockReturnValue({
      currentStep: ImportStep.SelectTemplates,
      horizontalSteps: [],
      isFirstStep: false,
      isLastStep: true,
      goToStep: mockGoToStep,
    });

    render(<TemplateFlyout onClose={mockOnClose} onImport={mockOnImport} />);

    await userEvent.click(screen.getByText('Mock Row Click'));
    expect(screen.getByTestId('template-preview-panel')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Mock Row Click'));
    expect(screen.queryByTestId('template-preview-panel')).not.toBeInTheDocument();
  });

  it('navigates back to upload step when back is clicked', async () => {
    mockUseImportSteps.mockReturnValue({
      currentStep: ImportStep.SelectTemplates,
      horizontalSteps: [],
      isFirstStep: false,
      isLastStep: true,
      goToStep: mockGoToStep,
    });

    render(<TemplateFlyout onClose={mockOnClose} onImport={mockOnImport} />);

    await userEvent.click(screen.getByText('Back'));

    expect(mockGoToStep).toHaveBeenCalledWith(ImportStep.UploadYaml);
  });

  it('handles parsing errors', async () => {
    mockParseFiles.mockResolvedValue({
      templates: [],
      errors: [{ fileName: 'test.yaml', documentIndex: 0, message: 'Parse error' }],
    });

    render(<TemplateFlyout onClose={mockOnClose} onImport={mockOnImport} />);

    await userEvent.click(screen.getByText('Mock Upload'));
    await userEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(mockParseFiles).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockGoToStep).toHaveBeenCalledWith(ImportStep.SelectTemplates);
    });
  });

  it('shows loading state while importing', () => {
    mockUseImportTemplates.mockReturnValue({
      importTemplates: mockImportTemplates,
      isImporting: true,
    });

    render(<TemplateFlyout onClose={mockOnClose} onImport={mockOnImport} />);

    expect(screen.getByTestId('template-flyout')).toBeInTheDocument();
  });
});

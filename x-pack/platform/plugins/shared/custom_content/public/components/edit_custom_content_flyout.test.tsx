/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedCodeEditor } from '@kbn/code-editor-mock';
import type { MockedMonacoEditor } from '@kbn/code-editor-mock/monaco_mock';

vi.mock('@kbn/code-editor', async () => {
  const original = await vi.importActual('@kbn/code-editor');
  return {
    ...original,
    CodeEditor: (props: ComponentProps<typeof MockedMonacoEditor>) => (
      <MockedCodeEditor {...props} />
    ),
  };
});

vi.mock('../hooks/use_edit_flyout_state');
vi.mock('../services');
vi.mock('./esql_preview_section', () => {
  const mocked = {
    EsqlPreviewSection: () => <div data-test-subj="mockEsqlPreviewSection" />,
  };
  return { ...mocked, default: mocked };
});

import { useEditFlyoutState } from '../hooks/use_edit_flyout_state';
import { getServices } from '../services';
import { EditCustomContentFlyout } from './edit_custom_content_flyout';

const mockUseEditFlyoutState = useEditFlyoutState as Mock;

const mockTelemetry = {
  trackPanelSaved: vi.fn(),
  trackGenerateWithChatClicked: vi.fn(),
};

vi.mock('../telemetry', () => {
  const mocked = { getTelemetry: () => mockTelemetry };
  return { ...mocked, default: mocked };
});

const baseFlyoutState = {
  draftEsqlQuery: '',
  setDraftEsqlQuery: vi.fn(),
  draftTemplate: '',
  setDraftTemplate: vi.fn(),
  isAiAvailable: true,
  isDataLoading: false,
  esqlData: null,
  esqlDataError: null,
  handleFetchData: vi.fn(),
  isRenderLoading: false,
  handleRender: vi.fn(),
};

const defaultProps = {
  esqlQuery: undefined as string | undefined,
  template: undefined as string | undefined,
  timeRange: undefined,
  isApproximate: false,
  projectRouting: undefined,
  query: undefined,
  filters: undefined,
  esqlVariables: undefined,
  onSave: vi.fn(),
  onClose: vi.fn(),
  onRunPreview: vi.fn(),
  onGenerateWithChat: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseEditFlyoutState.mockReturnValue(baseFlyoutState);
  (getServices as Mock).mockReturnValue({
    core: {
      docLinks: { links: { visualize: { customPanels: 'https://docs.example/custom-panels' } } },
    },
  });
});

describe('EditCustomContentFlyout', () => {
  describe('Apply and close', () => {
    it('is disabled when nothing has been edited', () => {
      mockUseEditFlyoutState.mockReturnValue({
        ...baseFlyoutState,
        draftEsqlQuery: 'FROM logs',
        draftTemplate: '<p>hi</p>',
      });
      render(
        <EditCustomContentFlyout {...defaultProps} esqlQuery="FROM logs" template="<p>hi</p>" />
      );
      expect(screen.getByRole('button', { name: 'Apply and close' })).toBeDisabled();
    });

    it('is enabled when the query differs from the saved value', () => {
      mockUseEditFlyoutState.mockReturnValue({ ...baseFlyoutState, draftEsqlQuery: 'FROM other' });
      render(<EditCustomContentFlyout {...defaultProps} esqlQuery="FROM logs" />);
      expect(screen.getByRole('button', { name: 'Apply and close' })).not.toBeDisabled();
    });

    it('is enabled when the template differs from the saved value', () => {
      mockUseEditFlyoutState.mockReturnValue({
        ...baseFlyoutState,
        draftTemplate: '<p>edited</p>',
      });
      render(<EditCustomContentFlyout {...defaultProps} template="<p>hi</p>" />);
      expect(screen.getByRole('button', { name: 'Apply and close' })).not.toBeDisabled();
    });

    it('calls onSave with the draft values', async () => {
      const onSave = vi.fn();
      const onClose = vi.fn();
      mockUseEditFlyoutState.mockReturnValue({
        ...baseFlyoutState,
        draftEsqlQuery: 'FROM logs',
        draftTemplate: '<div></div>',
      });
      render(<EditCustomContentFlyout {...defaultProps} onSave={onSave} onClose={onClose} />);

      await userEvent.click(screen.getByRole('button', { name: 'Apply and close' }));

      expect(onSave).toHaveBeenCalledWith('FROM logs', '<div></div>');
      expect(onClose).not.toHaveBeenCalled();
      expect(mockTelemetry.trackPanelSaved).toHaveBeenCalledWith({
        isNewPanel: false,
        hasTemplate: true,
        hasEsqlQuery: true,
        templateSizeBytes: '<div></div>'.length,
      });
    });
  });

  it('links to the custom panels docs', () => {
    render(<EditCustomContentFlyout {...defaultProps} />);

    expect(screen.getByTestId('customContentFlyoutDocsLink')).toHaveAttribute(
      'href',
      'https://docs.example/custom-panels'
    );
  });

  describe('Cancel', () => {
    it('calls onClose without saving', async () => {
      const onSave = vi.fn();
      const onClose = vi.fn();
      render(<EditCustomContentFlyout {...defaultProps} onSave={onSave} onClose={onClose} />);

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onSave).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Run Preview', () => {
    it('is disabled when the template is empty', () => {
      mockUseEditFlyoutState.mockReturnValue({ ...baseFlyoutState, draftTemplate: '   ' });
      render(<EditCustomContentFlyout {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Run preview' })).toBeDisabled();
    });

    it('is enabled whenever there is a template, even with no unsaved edits', () => {
      mockUseEditFlyoutState.mockReturnValue({
        ...baseFlyoutState,
        draftEsqlQuery: 'FROM logs',
        draftTemplate: '<p>hi</p>',
      });
      render(
        <EditCustomContentFlyout {...defaultProps} esqlQuery="FROM logs" template="<p>hi</p>" />
      );
      expect(screen.getByRole('button', { name: 'Run preview' })).not.toBeDisabled();
    });

    it('is enabled when the draft differs from the saved value', () => {
      mockUseEditFlyoutState.mockReturnValue({
        ...baseFlyoutState,
        draftTemplate: '<p>edited</p>',
      });
      render(<EditCustomContentFlyout {...defaultProps} template="<p>hi</p>" />);
      expect(screen.getByRole('button', { name: 'Run preview' })).not.toBeDisabled();
    });

    it('calls handleRender when clicked', async () => {
      const handleRender = vi.fn();
      mockUseEditFlyoutState.mockReturnValue({
        ...baseFlyoutState,
        draftEsqlQuery: 'FROM logs',
        draftTemplate: '<p>hi</p>',
        handleRender,
      });
      render(<EditCustomContentFlyout {...defaultProps} esqlQuery="FROM other" />);

      await userEvent.click(screen.getByRole('button', { name: 'Run preview' }));

      expect(handleRender).toHaveBeenCalled();
    });
  });

  describe('chat button', () => {
    it('is hidden when AI is not available', () => {
      mockUseEditFlyoutState.mockReturnValue({ ...baseFlyoutState, isAiAvailable: false });
      render(<EditCustomContentFlyout {...defaultProps} />);
      expect(screen.queryByRole('button', { name: /with chat/i })).not.toBeInTheDocument();
    });

    it('shows "Generate with chat" when the template is empty', () => {
      mockUseEditFlyoutState.mockReturnValue({ ...baseFlyoutState, draftTemplate: '' });
      render(<EditCustomContentFlyout {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Generate with chat' })).toBeInTheDocument();
    });

    it('shows "Refine with chat" when the template has content', () => {
      mockUseEditFlyoutState.mockReturnValue({
        ...baseFlyoutState,
        draftTemplate: '<p>hi</p>',
      });
      render(<EditCustomContentFlyout {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Refine with chat' })).toBeInTheDocument();
    });

    it('calls onGenerateWithChat with the draft template and esqlQuery when clicked', async () => {
      const onGenerateWithChat = vi.fn();
      mockUseEditFlyoutState.mockReturnValue({
        ...baseFlyoutState,
        draftEsqlQuery: 'FROM logs',
        draftTemplate: '<p>hi</p>',
      });
      render(<EditCustomContentFlyout {...defaultProps} onGenerateWithChat={onGenerateWithChat} />);

      await userEvent.click(screen.getByRole('button', { name: 'Refine with chat' }));

      expect(onGenerateWithChat).toHaveBeenCalledWith('<p>hi</p>', 'FROM logs');
      expect(mockTelemetry.trackGenerateWithChatClicked).toHaveBeenCalledWith({
        triggerSource: 'flyout',
        hasExistingTemplate: true,
      });
    });

    it('calls onGenerateWithChat when clicked with an empty template', async () => {
      const onGenerateWithChat = vi.fn();
      render(<EditCustomContentFlyout {...defaultProps} onGenerateWithChat={onGenerateWithChat} />);

      await userEvent.click(screen.getByRole('button', { name: 'Generate with chat' }));

      expect(onGenerateWithChat).toHaveBeenCalledWith('', undefined);
      expect(mockTelemetry.trackGenerateWithChatClicked).toHaveBeenCalledWith({
        triggerSource: 'flyout',
        hasExistingTemplate: false,
      });
    });
  });
});

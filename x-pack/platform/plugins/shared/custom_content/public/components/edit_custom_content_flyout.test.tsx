/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedCodeEditor } from '@kbn/code-editor-mock';
import type { MockedMonacoEditor } from '@kbn/code-editor-mock/monaco_mock';

jest.mock('@kbn/code-editor', () => {
  const original = jest.requireActual('@kbn/code-editor');
  return {
    ...original,
    CodeEditor: (props: ComponentProps<typeof MockedMonacoEditor>) => (
      <MockedCodeEditor {...props} />
    ),
  };
});

jest.mock('../hooks/use_edit_flyout_state');
jest.mock('../services');
jest.mock('./esql_preview_section', () => ({
  EsqlPreviewSection: () => <div data-test-subj="mockEsqlPreviewSection" />,
}));

import { useEditFlyoutState } from '../hooks/use_edit_flyout_state';
import { getServices } from '../services';
import { EditCustomContentFlyout } from './edit_custom_content_flyout';

const mockUseEditFlyoutState = useEditFlyoutState as jest.Mock;

const baseFlyoutState = {
  draftEsqlQuery: '',
  setDraftEsqlQuery: jest.fn(),
  draftTemplate: '',
  setDraftTemplate: jest.fn(),
  isAiAvailable: true,
  isDataLoading: false,
  esqlData: null,
  esqlDataError: null,
  handleFetchData: jest.fn(),
  isRenderLoading: false,
  hasPreviewedCurrentDraft: false,
  handleRender: jest.fn(),
};

const defaultProps = {
  esqlQuery: undefined as string | undefined,
  template: undefined as string | undefined,
  timeRange: undefined,
  isApproximate: false,
  projectRouting: undefined,
  query: undefined,
  filters: undefined,
  onSave: jest.fn(),
  onClose: jest.fn(),
  onRunPreview: jest.fn(),
  onGenerateWithChat: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseEditFlyoutState.mockReturnValue(baseFlyoutState);
  (getServices as jest.Mock).mockReturnValue({});
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
      const onSave = jest.fn();
      const onClose = jest.fn();
      mockUseEditFlyoutState.mockReturnValue({
        ...baseFlyoutState,
        draftEsqlQuery: 'FROM logs',
        draftTemplate: '<div></div>',
      });
      render(<EditCustomContentFlyout {...defaultProps} onSave={onSave} onClose={onClose} />);

      await userEvent.click(screen.getByRole('button', { name: 'Apply and close' }));

      expect(onSave).toHaveBeenCalledWith('FROM logs', '<div></div>');
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Cancel', () => {
    it('calls onClose without saving', async () => {
      const onSave = jest.fn();
      const onClose = jest.fn();
      render(<EditCustomContentFlyout {...defaultProps} onSave={onSave} onClose={onClose} />);

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onSave).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Run Preview', () => {
    it('is disabled when nothing has been edited', () => {
      mockUseEditFlyoutState.mockReturnValue({
        ...baseFlyoutState,
        draftEsqlQuery: 'FROM logs',
        draftTemplate: '<p>hi</p>',
      });
      render(
        <EditCustomContentFlyout {...defaultProps} esqlQuery="FROM logs" template="<p>hi</p>" />
      );
      expect(screen.getByRole('button', { name: 'Run preview' })).toBeDisabled();
    });

    it('is enabled when the query differs from the saved value', () => {
      mockUseEditFlyoutState.mockReturnValue({
        ...baseFlyoutState,
        draftEsqlQuery: 'FROM other',
        draftTemplate: '<p>hi</p>',
      });
      render(<EditCustomContentFlyout {...defaultProps} esqlQuery="FROM logs" />);
      expect(screen.getByRole('button', { name: 'Run preview' })).not.toBeDisabled();
    });

    it('is enabled when the template differs from the saved value', () => {
      mockUseEditFlyoutState.mockReturnValue({
        ...baseFlyoutState,
        draftTemplate: '<p>edited</p>',
      });
      render(<EditCustomContentFlyout {...defaultProps} template="<p>hi</p>" />);
      expect(screen.getByRole('button', { name: 'Run preview' })).not.toBeDisabled();
    });

    it('is disabled after preview has been applied to the current draft', () => {
      mockUseEditFlyoutState.mockReturnValue({
        ...baseFlyoutState,
        draftEsqlQuery: 'FROM other',
        hasPreviewedCurrentDraft: true,
      });
      render(<EditCustomContentFlyout {...defaultProps} esqlQuery="FROM logs" />);
      expect(screen.getByRole('button', { name: 'Run preview' })).toBeDisabled();
    });

    it('calls handleRender when clicked', async () => {
      const handleRender = jest.fn();
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
      const onGenerateWithChat = jest.fn();
      mockUseEditFlyoutState.mockReturnValue({
        ...baseFlyoutState,
        draftEsqlQuery: 'FROM logs',
        draftTemplate: '<p>hi</p>',
      });
      render(<EditCustomContentFlyout {...defaultProps} onGenerateWithChat={onGenerateWithChat} />);

      await userEvent.click(screen.getByRole('button', { name: 'Refine with chat' }));

      expect(onGenerateWithChat).toHaveBeenCalledWith('<p>hi</p>', 'FROM logs');
    });

    it('calls onGenerateWithChat when clicked with an empty template', async () => {
      const onGenerateWithChat = jest.fn();
      render(<EditCustomContentFlyout {...defaultProps} onGenerateWithChat={onGenerateWithChat} />);

      await userEvent.click(screen.getByRole('button', { name: 'Generate with chat' }));

      expect(onGenerateWithChat).toHaveBeenCalledWith('', undefined);
    });
  });
});

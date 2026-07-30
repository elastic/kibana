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
import { CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE } from '../../common/panel_context_attachment';

const mockUseEditFlyoutState = useEditFlyoutState as jest.Mock;

const baseFlyoutState = {
  draftEsqlQuery: '',
  setDraftEsqlQuery: jest.fn(),
  draftTemplate: '',
  setDraftTemplate: jest.fn(),
  isAiAvailable: true,
  isPreviewLoading: false,
  previewData: null,
  previewError: null,
  handlePreview: jest.fn(),
};

const setChatConfig = jest.fn();
const openChat = jest.fn();

const defaultProps = {
  embeddableId: 'panel-1',
  esqlQuery: undefined as string | undefined,
  template: undefined as string | undefined,
  timeRange: undefined,
  onSave: jest.fn(),
  onAgentUpdate: jest.fn(),
  onClose: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseEditFlyoutState.mockReturnValue(baseFlyoutState);
  (getServices as jest.Mock).mockReturnValue({
    agentBuilder: { setChatConfig, openChat },
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

    it('calls onSave with the draft values and closes', async () => {
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
      expect(onClose).toHaveBeenCalled();
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

  describe('Refine with chat', () => {
    it('is hidden when AI is not available', () => {
      mockUseEditFlyoutState.mockReturnValue({ ...baseFlyoutState, isAiAvailable: false });
      render(<EditCustomContentFlyout {...defaultProps} />);
      expect(screen.queryByRole('button', { name: 'Refine with chat' })).not.toBeInTheDocument();
    });

    it('sets the chat config and opens the chat when clicked', async () => {
      mockUseEditFlyoutState.mockReturnValue({
        ...baseFlyoutState,
        draftEsqlQuery: 'FROM logs',
        draftTemplate: '<p>hi</p>',
      });
      render(<EditCustomContentFlyout {...defaultProps} />);

      await userEvent.click(screen.getByRole('button', { name: 'Refine with chat' }));

      expect(openChat).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionTag: 'custom_content-panel-1',
          attachments: [expect.objectContaining({ type: CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE })],
          browserApiTools: [expect.objectContaining({ id: 'custom_content_update_panel' })],
        })
      );
    });

    it('closes the flyout when clicked', async () => {
      const onClose = jest.fn();
      render(<EditCustomContentFlyout {...defaultProps} onClose={onClose} />);

      await userEvent.click(screen.getByRole('button', { name: 'Refine with chat' }));

      expect(onClose).toHaveBeenCalled();
    });
  });
});

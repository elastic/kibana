/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIAgentConfirmationModal } from './ai_agent_confirmation_modal';
import { I18nProvider } from '@kbn/i18n-react';
import type { DocLinks } from '@kbn/doc-links';

describe('AIAgentConfirmationModal', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  const mockDocLinks: DocLinks = {
    agentBuilder: {
      learnMore: 'https://www.elastic.co/docs/explore-analyze/ai-features/ai-agent-or-ai-assistant',
    },
  } as DocLinks;

  const renderComponent = () => {
    return render(
      <I18nProvider>
        <AIAgentConfirmationModal
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          docLinks={mockDocLinks}
        />
      </I18nProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Modal Rendering', () => {
    it('renders modal with title and beta badge', () => {
      renderComponent();

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByText('Switch to AI Agent')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
    });

    it('displays warning about space-wide impact', () => {
      renderComponent();

      expect(
        screen.getByText((content) =>
          content.includes('Switching to AI Agent will affect all users in this space')
        )
      ).toBeInTheDocument();
    });

    it('renders confirm and cancel buttons', () => {
      renderComponent();

      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onConfirm when Confirm button is clicked', async () => {
      renderComponent();

      await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('calls onCancel when Cancel button is clicked', async () => {
      renderComponent();

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria attributes', () => {
      renderComponent();

      const modal = screen.getByRole('alertdialog');
      expect(modal).toHaveAttribute('aria-labelledby');
    });
  });
});

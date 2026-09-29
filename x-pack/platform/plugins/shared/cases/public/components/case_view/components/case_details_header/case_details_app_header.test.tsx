/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';

import { CaseDetailsAppHeader } from './case_details_app_header';
import { renderWithTestingProviders } from '../../../../common/mock';
import { basicCase } from '../../../../containers/mock';
import { useGetCaseConnectors } from '../../../../containers/use_get_case_connectors';
import { useDeleteCases } from '../../../../containers/use_delete_cases';
import { useShouldDisableStatus } from '../../../actions/status/use_should_disable_status';
import { useStatusAction } from '../../../actions/status/use_status_action';
import { useAddCaseToChat } from '../../../../agent_builder/use_add_case_to_chat';

vi.mock('../../../../containers/use_get_case_connectors');
vi.mock('../../../../containers/use_delete_cases');
vi.mock('../../../actions/status/use_should_disable_status');
vi.mock('../../../actions/status/use_status_action');
vi.mock('../../../../common/navigation/hooks');
vi.mock('../../../../common/lib/kibana');
vi.mock('../../../../agent_builder/use_add_case_to_chat');
vi.mock('../../use_on_refresh_case_view_page');

vi.mock('../../../confirm_delete_case', () => {
      const mocked = {
      ConfirmDeleteCaseModal: () => <div data-test-subj="confirm-delete-modal" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./case_settings_popover', () => {
      const mocked = {
      CaseSettingsPopover: () => <div data-test-subj="case-settings-popover" />,
    };
      return { ...mocked, default: mocked };
    });

(useGetCaseConnectors as Mock).mockReturnValue({ data: {} });
(useDeleteCases as Mock).mockReturnValue({ mutate: vi.fn() });
(useShouldDisableStatus as Mock).mockReturnValue(() => false);
(useStatusAction as Mock).mockReturnValue({ handleUpdateCaseStatus: vi.fn() });
(useAddCaseToChat as Mock).mockReturnValue({
  addToChat: vi.fn(),
  summarizeCase: vi.fn(),
  isAddToChatAvailable: false,
});

describe('CaseDetailsAppHeader', () => {
  const onUpdateField = vi.fn();
  const onShowMetricsChange = vi.fn();

  const defaultProps = {
    caseData: basicCase,
    onUpdateField,
    showMetrics: true,
    onShowMetricsChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useGetCaseConnectors as Mock).mockReturnValue({ data: {} });
    (useDeleteCases as Mock).mockReturnValue({ mutate: vi.fn() });
    (useShouldDisableStatus as Mock).mockReturnValue(() => false);
    (useStatusAction as Mock).mockReturnValue({ handleUpdateCaseStatus: vi.fn() });
    (useAddCaseToChat as Mock).mockReturnValue({
      addToChat: vi.fn(),
      summarizeCase: vi.fn(),
      isAddToChatAvailable: false,
    });
  });

  it('renders the app header with case title', async () => {
    renderWithTestingProviders(<CaseDetailsAppHeader {...defaultProps} />);

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.root)).toBeInTheDocument();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(basicCase.title);
  });

  it('renders metadata with reporter name', async () => {
    renderWithTestingProviders(<CaseDetailsAppHeader {...defaultProps} />);

    const metadata = await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.metadata);
    expect(metadata.textContent).toContain('Reported by');
    expect(metadata.textContent).toContain(basicCase.createdBy.fullName!);
  });

  it('renders badges in the header', async () => {
    renderWithTestingProviders(<CaseDetailsAppHeader {...defaultProps} />);

    expect(await screen.findByTestId('case-view-severity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('case-view-status-badge')).toBeInTheDocument();
  });

  it('does not render delete modal by default', async () => {
    renderWithTestingProviders(<CaseDetailsAppHeader {...defaultProps} />);

    await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.root);

    expect(screen.queryByTestId('confirm-delete-modal')).not.toBeInTheDocument();
  });

  it('does not render settings popover by default', async () => {
    renderWithTestingProviders(<CaseDetailsAppHeader {...defaultProps} />);

    await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.root);

    expect(screen.queryByTestId('case-settings-popover')).not.toBeInTheDocument();
  });

  it('does not render settings popover when user lacks update permissions', async () => {
    renderWithTestingProviders(<CaseDetailsAppHeader {...defaultProps} />, {
      wrapperProps: {
        permissions: {
          all: false,
          create: true,
          read: true,
          update: false,
          delete: true,
          push: true,
          connectors: true,
          settings: true,
          reopenCase: true,
          createComment: true,
          assign: true,
          manageTemplates: true,
        },
      },
    });

    await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.root);

    await waitFor(() => {
      expect(screen.queryByTestId('case-settings-popover')).not.toBeInTheDocument();
    });
  });

  it('adds the case to chat from the chat actions dropdown', async () => {
    const addToChat = vi.fn();
    (useAddCaseToChat as Mock).mockReturnValue({
      addToChat,
      summarizeCase: vi.fn(),
      isAddToChatAvailable: true,
    });

    renderWithTestingProviders(<CaseDetailsAppHeader {...defaultProps} />);

    await userEvent.click(await screen.findByTestId('case-chat-actions'));
    fireEvent.click(await screen.findByTestId('case-chat-action-add-to-chat'));

    expect(addToChat).toHaveBeenCalled();
  });

  it('renders summarize case in the chat actions dropdown', async () => {
    (useAddCaseToChat as Mock).mockReturnValue({
      addToChat: vi.fn(),
      summarizeCase: vi.fn(),
      isAddToChatAvailable: true,
    });

    renderWithTestingProviders(<CaseDetailsAppHeader {...defaultProps} />);

    await userEvent.click(await screen.findByTestId('case-chat-actions'));

    expect(await screen.findByTestId('case-chat-action-add-to-chat')).toBeInTheDocument();
    expect(screen.getByTestId('case-chat-action-summarize')).toBeInTheDocument();
  });
});

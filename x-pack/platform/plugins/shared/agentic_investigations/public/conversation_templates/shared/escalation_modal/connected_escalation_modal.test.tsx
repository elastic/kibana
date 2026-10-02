/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { EscalationModalRenderProps } from '@kbn/agentic-investigations-common';
import type { Investigation } from '@kbn/agentic-investigations-common';
import {
  useListEscalations,
  useCreateEscalation,
  useAttachToEscalation,
  useEscalationsForInvestigation,
} from '../../../escalations/hooks/use_escalations_api';
import { useCurrentUserProfile, useSuggestUserProfiles } from '../../../user_profiles';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useOpenInChat } from '../../../hooks/use_open_in_chat';
import { ConnectedEscalationModal } from './connected_escalation_modal';

jest.mock('../../../escalations/hooks/use_escalations_api', () => ({
  useListEscalations: jest.fn(),
  useCreateEscalation: jest.fn(),
  useAttachToEscalation: jest.fn(),
  useEscalationsForInvestigation: jest.fn(),
}));

jest.mock('../../../user_profiles', () => ({
  useCurrentUserProfile: jest.fn(),
  useSuggestUserProfiles: jest.fn(),
}));

jest.mock('../../../hooks/use_agentic_investigations_capabilities', () => ({
  useAgenticInvestigationsCapabilities: jest.fn(() => ({
    showEscalations: true,
    manageEscalations: true,
    manageInvestigations: true,
  })),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../../hooks/use_open_in_chat', () => ({
  useOpenInChat: jest.fn(),
}));

jest.mock('@kbn/user-profile-components', () => ({
  getUserDisplayName: (user: { username?: string }) => user?.username ?? '',
  UserProfilesSelectable: () => <div data-test-subj="escalationModalAssigneePicker" />,
}));

jest.mock('@kbn/core-http-browser', () => ({
  isHttpFetchError: jest.fn(() => false),
}));

const mockUseListEscalations = useListEscalations as jest.MockedFunction<typeof useListEscalations>;
const mockUseCreateEscalation = useCreateEscalation as jest.MockedFunction<
  typeof useCreateEscalation
>;
const mockUseAttachToEscalation = useAttachToEscalation as jest.MockedFunction<
  typeof useAttachToEscalation
>;
const mockUseCurrentUserProfile = useCurrentUserProfile as jest.MockedFunction<
  typeof useCurrentUserProfile
>;
const mockUseSuggestUserProfiles = useSuggestUserProfiles as jest.MockedFunction<
  typeof useSuggestUserProfiles
>;
const mockUseEscalationsForInvestigation = useEscalationsForInvestigation as jest.MockedFunction<
  typeof useEscalationsForInvestigation
>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseOpenInChat = useOpenInChat as jest.MockedFunction<typeof useOpenInChat>;

let getChatHref: jest.Mock;
let openChatMock: jest.Mock;

const createMutate = jest.fn();
const addMutate = jest.fn();
const onClose = jest.fn();

const investigation: Investigation = {
  id: 'inv-1',
  template_id: 'investigation',
  title: 'Suspicious login',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  watch_id: 'watch-1',
  watch_execution_id: 'exec-1',
  pendingProposalCount: 0,
  assignees: [],
  events: [],
  recordId: 'inv-1',
  conversationId: 'conv-1',
};

const defaultProps: EscalationModalRenderProps = {
  mode: 'create',
  investigation,
  onClose,
};

const renderModal = (props: Partial<EscalationModalRenderProps> = {}) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <ConnectedEscalationModal {...defaultProps} {...props} />
      </EuiProvider>
    </I18nProvider>
  );

beforeEach(() => {
  getChatHref = jest.fn(
    (id: string, agentId?: string) => `/mock-chat/${agentId ?? 'no-agent'}/${id}`
  );
  openChatMock = jest.fn();
  mockUseOpenInChat.mockReturnValue({
    getChatHref,
    openChat: openChatMock,
  });

  mockUseListEscalations.mockReturnValue({
    data: { results: [], pagination: { total: 0, page: 1, per_page: 20 } },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useListEscalations>);

  mockUseCreateEscalation.mockReturnValue({
    mutate: createMutate,
    isLoading: false,
  } as unknown as ReturnType<typeof useCreateEscalation>);

  mockUseAttachToEscalation.mockReturnValue({
    mutate: addMutate,
    isLoading: false,
  } as unknown as ReturnType<typeof useAttachToEscalation>);

  mockUseCurrentUserProfile.mockReturnValue({
    data: { uid: 'user-1', user: { username: 'alice' } },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useCurrentUserProfile>);

  mockUseSuggestUserProfiles.mockReturnValue({
    data: [],
    isFetching: false,
  } as unknown as ReturnType<typeof useSuggestUserProfiles>);

  mockUseEscalationsForInvestigation.mockReturnValue({
    data: { results: [], pagination: { total: 0, page: 1, per_page: 50 } },
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useEscalationsForInvestigation>);

  mockUseKibana.mockReturnValue({
    services: {
      notifications: { toasts: { addDanger: jest.fn(), addSuccess: jest.fn() } },
      application: {
        getUrlForApp: jest.fn(
          (_appId: string, { path = '' }: { path?: string } = {}) => `/base/app/alertzero${path}`
        ),
        navigateToApp: jest.fn(),
      },
    },
  } as unknown as ReturnType<typeof useKibana>);
});

afterEach(() => jest.clearAllMocks());

describe('ConnectedEscalationModal', () => {
  it('renders nothing when investigation has no conversationId', () => {
    const { container } = renderModal({
      investigation: { ...investigation, conversationId: undefined },
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the modal with the investigation title in the subtitle', () => {
    renderModal();

    expect(screen.getByTestId('escalationModal')).toBeInTheDocument();
    expect(screen.getByText(/Suspicious login/)).toBeInTheDocument();
  });

  it('starts in create mode when initialMode is create', () => {
    renderModal({ mode: 'create' });

    const createRadio = document.getElementById('escalation-mode-create') as HTMLInputElement;
    expect(createRadio.checked).toBe(true);
  });

  it('starts in addToExisting mode when initialMode is addToExisting', () => {
    renderModal({ mode: 'addToExisting' });

    const addRadio = document.getElementById('escalation-mode-add-to-existing') as HTMLInputElement;
    expect(addRadio.checked).toBe(true);
  });

  it('switches to addToExisting mode when that panel is clicked', () => {
    renderModal({ mode: 'create' });

    fireEvent.click(screen.getByTestId('escalationModalModeAddToExisting'));

    const addRadio = document.getElementById('escalation-mode-add-to-existing') as HTMLInputElement;
    expect(addRadio.checked).toBe(true);
  });

  it('switches back to create mode when the create panel is clicked', () => {
    renderModal({ mode: 'addToExisting' });

    fireEvent.click(screen.getByTestId('escalationModalModeCreate'));

    const createRadio = document.getElementById('escalation-mode-create') as HTMLInputElement;
    expect(createRadio.checked).toBe(true);
  });

  it('calls createEscalation.mutate when the create form is submitted', () => {
    renderModal({ mode: 'create' });

    fireEvent.click(screen.getByTestId('escalationModalCreateEscalation'));

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        linked_investigation_id: 'conv-1',
        visibility: 'public',
      }),
      expect.any(Object)
    );
  });

  it('includes the current user uid in assignees for a public escalation', () => {
    renderModal({ mode: 'create' });

    fireEvent.click(screen.getByTestId('escalationModalCreateEscalation'));

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ assignees: ['user-1'] }),
      expect.any(Object)
    );
  });

  it('marks escalations already linked to the conversation as alreadyLinked', () => {
    mockUseListEscalations.mockReturnValue({
      data: {
        results: [
          {
            id: 'esc-1',
            title: 'Existing escalation',
            metadata: { linked_investigations: ['conv-1'] },
            permissions: { rename: true, delete: true, update_access_control: true },
          },
        ],
        pagination: { total: 1, page: 1, per_page: 20 },
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useListEscalations>);

    renderModal({ mode: 'addToExisting' });

    const radio = document.getElementById('incident-esc-1') as HTMLInputElement;
    expect(radio).toBeDisabled();
  });

  it('disables non-owner escalations (canManage: false)', () => {
    mockUseListEscalations.mockReturnValue({
      data: {
        results: [
          {
            id: 'esc-2',
            title: 'Participant escalation',
            metadata: { linked_investigations: [] },
            permissions: { rename: false, delete: false, update_access_control: false },
          },
        ],
        pagination: { total: 1, page: 1, per_page: 20 },
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useListEscalations>);

    renderModal({ mode: 'addToExisting' });

    const radio = document.getElementById('incident-esc-2') as HTMLInputElement;
    expect(radio).toBeDisabled();
  });

  it('shows a loading spinner in create mode while the user profile is loading', () => {
    mockUseCurrentUserProfile.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useCurrentUserProfile>);

    renderModal({ mode: 'create' });

    // The create form must not render yet; a spinner is shown instead.
    expect(screen.queryByTestId('escalationModalCreateEscalation')).not.toBeInTheDocument();
  });

  it('shows an error callout with retry in create mode when the profile fetch fails', () => {
    const refetch = jest.fn();
    mockUseCurrentUserProfile.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    } as unknown as ReturnType<typeof useCurrentUserProfile>);

    renderModal({ mode: 'create' });

    expect(screen.queryByTestId('escalationModalCreateEscalation')).not.toBeInTheDocument();
    // The error callout must contain a retry button that calls refetch.
    expect(screen.getByText('Failed to load your profile. Try again.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Retry'));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows an unavailable callout in create mode when the profile is null', () => {
    mockUseCurrentUserProfile.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useCurrentUserProfile>);

    renderModal({ mode: 'create' });

    expect(screen.queryByTestId('escalationModalCreateEscalation')).not.toBeInTheDocument();
    expect(
      screen.getByText('Your user profile is unavailable. Private escalations cannot be created.')
    ).toBeInTheDocument();
  });

  it('shows an error callout when the escalations query fails', () => {
    mockUseListEscalations.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useListEscalations>);

    renderModal({ mode: 'addToExisting' });

    expect(screen.getByTestId('escalationModalLoadError')).toBeInTheDocument();
  });

  it('success toast for create links to the newly created escalation in Agent Builder', () => {
    renderModal({ mode: 'create' });
    fireEvent.click(screen.getByTestId('escalationModalCreateEscalation'));

    const [, callbacks] = createMutate.mock.calls[0];
    const { services } = (mockUseKibana as jest.Mock).mock.results[0].value;
    // onSuccess receives the created Conversation; id and agent_id are used to deep-link.
    callbacks.onSuccess({ id: 'new-esc-1', agent_id: 'new-agent-1' });

    expect(getChatHref).toHaveBeenCalledWith('new-esc-1', 'new-agent-1');
    expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        actionProps: expect.objectContaining({
          primary: expect.objectContaining({
            href: '/mock-chat/new-agent-1/new-esc-1',
          }),
        }),
      })
    );
  });

  it('success toast for add-to links to the selected escalation in Agent Builder', () => {
    mockUseListEscalations.mockReturnValue({
      data: {
        results: [
          {
            id: 'esc-3',
            title: 'Open escalation',
            metadata: { linked_investigations: [] },
            permissions: { rename: true, delete: true, update_access_control: true },
          },
        ],
        pagination: { total: 1, page: 1, per_page: 20 },
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useListEscalations>);

    renderModal({ mode: 'addToExisting' });
    fireEvent.click(screen.getByTestId('escalationModalIncident-esc-3'));
    fireEvent.click(screen.getByTestId('escalationModalattachToEscalation'));

    const [, callbacks] = addMutate.mock.calls[0];
    const { services } = (mockUseKibana as jest.Mock).mock.results[0].value;
    // onSuccess receives the updated Conversation; id and agent_id are used to deep-link.
    callbacks.onSuccess({ id: 'esc-3', agent_id: 'agent-3' });

    expect(getChatHref).toHaveBeenCalledWith('esc-3', 'agent-3');
    expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        actionProps: expect.objectContaining({
          primary: expect.objectContaining({
            href: '/mock-chat/agent-3/esc-3',
          }),
        }),
      })
    );
  });

  describe('already-escalated callout', () => {
    it('does not render a callout when the investigation has no existing escalations', () => {
      // Default mock returns empty results — callout should be absent.
      renderModal();

      expect(
        screen.queryByTestId('escalationModalAlreadyEscalatedCallout')
      ).not.toBeInTheDocument();
    });

    it('renders a callout with a link when the investigation is already in one escalation', () => {
      mockUseEscalationsForInvestigation.mockReturnValue({
        data: {
          results: [
            {
              id: 'esc-existing-1',
              agent_id: 'agent-existing-1',
              title: 'P1 security breach',
              metadata: {},
              permissions: { rename: true, delete: true, update_access_control: true },
            },
          ],
          pagination: { total: 1, page: 1, per_page: 50 },
        },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useEscalationsForInvestigation>);

      renderModal();

      expect(screen.getByTestId('escalationModalAlreadyEscalatedCallout')).toBeInTheDocument();
      const link = screen.getByTestId('escalationModalExistingEscalationLink-esc-existing-1');
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent('P1 security breach');
      // href comes from getChatHref mock: /mock-chat/<agentId>/<id>
      expect(link).toHaveAttribute('href', '/mock-chat/agent-existing-1/esc-existing-1');
    });

    it('renders a callout with multiple links when the investigation is in several escalations', () => {
      mockUseEscalationsForInvestigation.mockReturnValue({
        data: {
          results: [
            {
              id: 'esc-a',
              agent_id: 'agent-a',
              title: 'Escalation A',
              metadata: {},
              permissions: { rename: true, delete: true, update_access_control: true },
            },
            {
              id: 'esc-b',
              agent_id: 'agent-b',
              title: 'Escalation B',
              metadata: {},
              permissions: { rename: true, delete: true, update_access_control: true },
            },
          ],
          pagination: { total: 2, page: 1, per_page: 50 },
        },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useEscalationsForInvestigation>);

      renderModal();

      expect(screen.getByTestId('escalationModalAlreadyEscalatedCallout')).toBeInTheDocument();
      expect(screen.getByTestId('escalationModalExistingEscalationLink-esc-a')).toBeInTheDocument();
      expect(screen.getByTestId('escalationModalExistingEscalationLink-esc-b')).toBeInTheDocument();
    });

    it('clicking a callout link calls openChat with the escalation id and agent id, then closes', () => {
      mockUseEscalationsForInvestigation.mockReturnValue({
        data: {
          results: [
            {
              id: 'esc-nav',
              agent_id: 'agent-nav',
              title: 'Navigable escalation',
              metadata: {},
              permissions: { rename: true, delete: true, update_access_control: true },
            },
          ],
          pagination: { total: 1, page: 1, per_page: 50 },
        },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useEscalationsForInvestigation>);

      renderModal();

      const link = screen.getByTestId('escalationModalExistingEscalationLink-esc-nav');
      fireEvent.click(link);

      expect(openChatMock).toHaveBeenCalledWith('esc-nav', 'agent-nav');
      expect(onClose).toHaveBeenCalled();
    });

    it('does not fetch escalations when showEscalations is false', () => {
      const { useAgenticInvestigationsCapabilities } = jest.requireMock(
        '../../../hooks/use_agentic_investigations_capabilities'
      );
      (useAgenticInvestigationsCapabilities as jest.Mock).mockReturnValueOnce({
        showEscalations: false,
        manageEscalations: false,
        manageInvestigations: true,
      });

      renderModal();

      // Both hooks should have been called with enabled: false.
      expect(mockUseEscalationsForInvestigation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ enabled: false })
      );
      expect(mockUseListEscalations).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false })
      );
    });
  });
});

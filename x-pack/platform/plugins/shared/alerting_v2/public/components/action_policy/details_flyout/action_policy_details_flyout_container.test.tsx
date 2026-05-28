/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { paths } from '../../../constants';
import { ActionPolicyDetailsFlyoutContainer } from './action_policy_details_flyout_container';

const mockNavigateToUrl = jest.fn();
const mockBasePathPrepend = jest.fn((p: string) => p);
const mockUseFetchActionPolicy = jest.fn();
const mockCreateActionPolicy = jest.fn();
const mockDeleteActionPolicy = jest.fn();
const mockEnablePolicy = jest.fn();
const mockDisablePolicy = jest.fn();
const mockSnoozePolicy = jest.fn();
const mockUnsnoozePolicy = jest.fn();
const mockUpdateApiKey = jest.fn();
const mockOnClose = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'application') return { navigateToUrl: mockNavigateToUrl };
    if (token === 'http') return { basePath: { prepend: mockBasePathPrepend } };
    return {};
  },
  CoreStart: (key: string) => key,
}));

jest.mock('../../../hooks/use_fetch_action_policy', () => ({
  useFetchActionPolicy: (...args: unknown[]) => mockUseFetchActionPolicy(...args),
}));
jest.mock('../../../hooks/use_create_action_policy', () => ({
  useCreateActionPolicy: () => ({ mutate: mockCreateActionPolicy }),
}));
jest.mock('../../../hooks/use_delete_action_policy', () => ({
  useDeleteActionPolicy: () => ({ mutate: mockDeleteActionPolicy, isLoading: false }),
}));
jest.mock('../../../hooks/use_enable_action_policy', () => ({
  useEnableActionPolicy: () => ({
    mutate: mockEnablePolicy,
    isLoading: false,
    variables: undefined,
  }),
}));
jest.mock('../../../hooks/use_disable_action_policy', () => ({
  useDisableActionPolicy: () => ({
    mutate: mockDisablePolicy,
    isLoading: false,
    variables: undefined,
  }),
}));
jest.mock('../../../hooks/use_snooze_action_policy', () => ({
  useSnoozeActionPolicy: () => ({ mutate: mockSnoozePolicy }),
}));
jest.mock('../../../hooks/use_unsnooze_action_policy', () => ({
  useUnsnoozeActionPolicy: () => ({ mutate: mockUnsnoozePolicy }),
}));
jest.mock('../../../hooks/use_update_action_policy_api_key', () => ({
  useUpdateActionPolicyApiKey: () => ({ mutate: mockUpdateApiKey, isLoading: false }),
}));

interface FlyoutMockProps {
  policy: ActionPolicyResponse;
  onClose: () => void;
  onEdit: (id: string) => void;
  onClone: (policy: ActionPolicyResponse) => void;
  onDelete: (policy: ActionPolicyResponse) => void;
  onEnable: (id: string) => void;
  onDisable: (id: string) => void;
  onSnooze: (id: string, until: string) => void;
  onCancelSnooze: (id: string) => void;
  onUpdateApiKey: (id: string) => void;
}

jest.mock('./action_policy_details_flyout', () => ({
  ActionPolicyDetailsFlyout: (props: FlyoutMockProps) => (
    <div data-test-subj="mockFlyout">
      <button
        data-test-subj="flyout-edit"
        onClick={() => props.onEdit(props.policy.id)}
        type="button"
      >
        edit
      </button>
      <button
        data-test-subj="flyout-clone"
        onClick={() => props.onClone(props.policy)}
        type="button"
      >
        clone
      </button>
      <button
        data-test-subj="flyout-delete"
        onClick={() => props.onDelete(props.policy)}
        type="button"
      >
        delete
      </button>
      <button
        data-test-subj="flyout-enable"
        onClick={() => props.onEnable(props.policy.id)}
        type="button"
      >
        enable
      </button>
      <button
        data-test-subj="flyout-disable"
        onClick={() => props.onDisable(props.policy.id)}
        type="button"
      >
        disable
      </button>
      <button
        data-test-subj="flyout-snooze"
        onClick={() => props.onSnooze(props.policy.id, '2026-12-31T00:00:00Z')}
        type="button"
      >
        snooze
      </button>
      <button
        data-test-subj="flyout-cancel-snooze"
        onClick={() => props.onCancelSnooze(props.policy.id)}
        type="button"
      >
        cancel snooze
      </button>
      <button
        data-test-subj="flyout-update-api-key"
        onClick={() => props.onUpdateApiKey(props.policy.id)}
        type="button"
      >
        update api key
      </button>
    </div>
  ),
}));

interface ConfirmModalMockProps {
  onCancel: () => void;
  onConfirm: () => void;
}

jest.mock('../delete_confirmation_modal', () => ({
  DeleteActionPolicyConfirmModal: (props: ConfirmModalMockProps & { policyName: string }) => (
    <div data-test-subj="mockDeleteModal">
      <span>{props.policyName}</span>
      <button data-test-subj="confirmDelete" onClick={props.onConfirm} type="button">
        confirm
      </button>
      <button data-test-subj="cancelDelete" onClick={props.onCancel} type="button">
        cancel
      </button>
    </div>
  ),
}));

jest.mock(
  '../../../pages/list_action_policies_page/components/update_api_key_confirmation_modal',
  () => ({
    UpdateApiKeyConfirmationModal: (props: ConfirmModalMockProps) => (
      <div data-test-subj="mockUpdateApiKeyModal">
        <button data-test-subj="confirmUpdateApiKey" onClick={props.onConfirm} type="button">
          confirm
        </button>
        <button data-test-subj="cancelUpdateApiKey" onClick={props.onCancel} type="button">
          cancel
        </button>
      </div>
    ),
  })
);

const buildPolicy = (overrides: Partial<ActionPolicyResponse> = {}): ActionPolicyResponse =>
  ({
    id: 'policy-1',
    name: 'My Policy',
    description: 'desc',
    destinations: [{ type: 'connector', id: 'c-1' }],
    groupingMode: 'per_episode',
    enabled: true,
    tags: ['t1'],
    type: 'global',
    ruleId: undefined,
    matcher: undefined,
    groupBy: undefined,
    throttle: undefined,
    ...overrides,
  } as ActionPolicyResponse);

const renderContainer = () =>
  render(
    <I18nProvider>
      <ActionPolicyDetailsFlyoutContainer policyId="policy-1" onClose={mockOnClose} />
    </I18nProvider>
  );

describe('ActionPolicyDetailsFlyoutContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the loading flyout while the policy is loading', () => {
    mockUseFetchActionPolicy.mockReturnValue({ data: undefined, isLoading: true });
    renderContainer();
    expect(screen.getByTestId('loadingFlyout')).toBeInTheDocument();
    expect(screen.queryByTestId('mockFlyout')).not.toBeInTheDocument();
    expect(screen.queryByTestId('entityNotFoundFlyout')).not.toBeInTheDocument();
  });

  it('renders the not-found flyout when the fetch errors out', async () => {
    mockUseFetchActionPolicy.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    renderContainer();

    expect(screen.getByTestId('entityNotFoundFlyout')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('entityNotFoundFlyoutCloseButton'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders the not-found flyout when the fetch settles with no data', () => {
    mockUseFetchActionPolicy.mockReturnValue({ data: null, isLoading: false, isError: false });
    renderContainer();

    expect(screen.getByTestId('entityNotFoundFlyout')).toBeInTheDocument();
    expect(screen.queryByTestId('mockFlyout')).not.toBeInTheDocument();
  });

  it('renders the flyout once the policy is loaded', () => {
    mockUseFetchActionPolicy.mockReturnValue({ data: buildPolicy() });
    renderContainer();
    expect(screen.getByTestId('mockFlyout')).toBeInTheDocument();
  });

  it('navigates to the edit page and calls onClose on edit', async () => {
    mockUseFetchActionPolicy.mockReturnValue({ data: buildPolicy() });
    renderContainer();

    await userEvent.click(screen.getByTestId('flyout-edit'));

    expect(mockBasePathPrepend).toHaveBeenCalledWith(paths.actionPolicyEdit('policy-1'));
    expect(mockNavigateToUrl).toHaveBeenCalledWith(paths.actionPolicyEdit('policy-1'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('clones the policy with a "[clone]" suffix and closes the flyout', async () => {
    mockUseFetchActionPolicy.mockReturnValue({ data: buildPolicy() });
    renderContainer();

    await userEvent.click(screen.getByTestId('flyout-clone'));

    expect(mockCreateActionPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'My Policy [clone]',
        description: 'desc',
        groupingMode: 'per_episode',
      })
    );
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('clones a single_rule policy carrying over the ruleId', async () => {
    mockUseFetchActionPolicy.mockReturnValue({
      data: buildPolicy({ type: 'single_rule', ruleId: 'rule-1' }),
    });
    renderContainer();

    await userEvent.click(screen.getByTestId('flyout-clone'));

    expect(mockCreateActionPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'My Policy [clone]',
        type: 'single_rule',
        ruleId: 'rule-1',
      })
    );
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  describe('delete flow', () => {
    it('hides the flyout and opens the delete modal when delete is clicked', async () => {
      mockUseFetchActionPolicy.mockReturnValue({ data: buildPolicy() });
      renderContainer();

      await userEvent.click(screen.getByTestId('flyout-delete'));

      expect(screen.getByTestId('mockDeleteModal')).toBeInTheDocument();
      expect(screen.queryByTestId('mockFlyout')).not.toBeInTheDocument();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('triggers delete + onClose on confirm', async () => {
      mockUseFetchActionPolicy.mockReturnValue({ data: buildPolicy() });
      mockDeleteActionPolicy.mockImplementation((_id, opts) => opts?.onSuccess?.());
      renderContainer();

      await userEvent.click(screen.getByTestId('flyout-delete'));
      await userEvent.click(screen.getByTestId('confirmDelete'));

      expect(mockDeleteActionPolicy).toHaveBeenCalledWith('policy-1', expect.any(Object));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('closes the flyout (via onClose) on cancel without calling delete', async () => {
      mockUseFetchActionPolicy.mockReturnValue({ data: buildPolicy() });
      renderContainer();

      await userEvent.click(screen.getByTestId('flyout-delete'));
      await userEvent.click(screen.getByTestId('cancelDelete'));

      expect(mockDeleteActionPolicy).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('update API key flow', () => {
    it('hides the flyout and opens the API key modal when update-api-key is clicked', async () => {
      mockUseFetchActionPolicy.mockReturnValue({ data: buildPolicy() });
      renderContainer();

      await userEvent.click(screen.getByTestId('flyout-update-api-key'));

      expect(screen.getByTestId('mockUpdateApiKeyModal')).toBeInTheDocument();
      expect(screen.queryByTestId('mockFlyout')).not.toBeInTheDocument();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('triggers update + onClose on confirm', async () => {
      mockUseFetchActionPolicy.mockReturnValue({ data: buildPolicy() });
      mockUpdateApiKey.mockImplementation((_id, opts) => opts?.onSuccess?.());
      renderContainer();

      await userEvent.click(screen.getByTestId('flyout-update-api-key'));
      await userEvent.click(screen.getByTestId('confirmUpdateApiKey'));

      expect(mockUpdateApiKey).toHaveBeenCalledWith('policy-1', expect.any(Object));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('closes the flyout (via onClose) on cancel without calling update', async () => {
      mockUseFetchActionPolicy.mockReturnValue({ data: buildPolicy() });
      renderContainer();

      await userEvent.click(screen.getByTestId('flyout-update-api-key'));
      await userEvent.click(screen.getByTestId('cancelUpdateApiKey'));

      expect(mockUpdateApiKey).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('forwards enable/disable mutations', async () => {
    mockUseFetchActionPolicy.mockReturnValue({ data: buildPolicy() });
    renderContainer();

    await userEvent.click(screen.getByTestId('flyout-enable'));
    expect(mockEnablePolicy).toHaveBeenCalledWith('policy-1');

    await userEvent.click(screen.getByTestId('flyout-disable'));
    expect(mockDisablePolicy).toHaveBeenCalledWith('policy-1');
  });

  it('forwards snooze with id + snoozedUntil and cancel-snooze', async () => {
    mockUseFetchActionPolicy.mockReturnValue({ data: buildPolicy() });
    renderContainer();

    await userEvent.click(screen.getByTestId('flyout-snooze'));
    expect(mockSnoozePolicy).toHaveBeenCalledWith({
      id: 'policy-1',
      snoozedUntil: '2026-12-31T00:00:00Z',
    });

    await userEvent.click(screen.getByTestId('flyout-cancel-snooze'));
    expect(mockUnsnoozePolicy).toHaveBeenCalledWith('policy-1');
  });
});

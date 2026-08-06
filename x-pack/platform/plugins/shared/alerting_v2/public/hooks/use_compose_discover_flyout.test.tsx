/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import type { RuleApiResponse } from '../services/rules_api';

const mockCreateMutateAsync = jest.fn();
const mockUpdateMutateAsync = jest.fn();
const mockSetupMutate = jest.fn();
const mockAddDanger = jest.fn();
const mockAddError = jest.fn();

let capturedFlyoutProps: Record<string, unknown> = {};

jest.mock('@kbn/alerting-v2-rule-form', () => ({
  ComposeDiscoverFlyout: (props: Record<string, unknown>) => {
    capturedFlyoutProps = props;
    return <div data-test-subj="mockComposeDiscoverFlyout" />;
  },
  RULE_BUILDER_REGISTRY: {},
}));

jest.mock('@kbn/react-kibana-mount', () => ({
  toMountPoint: (node: unknown) => node,
}));

jest.mock('./use_create_rule', () => ({
  useCreateRule: (
    options: {
      onErrorToast?: (error: Error, showDefaultToast: () => void) => void;
    } = {}
  ) => ({
    mutateAsync: async (...args: unknown[]) => {
      try {
        return await mockCreateMutateAsync(...args);
      } catch (error) {
        options.onErrorToast?.(error as Error, () =>
          mockAddError(error, { title: 'Rule not created' })
        );
        throw error;
      }
    },
    isLoading: false,
  }),
}));
jest.mock('./use_update_rule', () => ({
  useUpdateRule: (
    options: {
      onErrorToast?: (error: Error, showDefaultToast: () => void) => void;
    } = {}
  ) => ({
    mutateAsync: async (...args: unknown[]) => {
      try {
        return await mockUpdateMutateAsync(...args);
      } catch (error) {
        options.onErrorToast?.(error as Error, () =>
          mockAddError(error, { title: 'Edits not saved' })
        );
        throw error;
      }
    },
    isLoading: false,
  }),
}));
jest.mock('./use_setup_rule_notifications', () => ({
  useSetupRuleNotifications: () => ({ mutate: mockSetupMutate, isLoading: false }),
}));

const mockNavigateToUrl = jest.fn();

jest.mock('@kbn/core-di', () => ({
  PluginStart: (key: string) => `plugin:${key}`,
}));
jest.mock('@kbn/core-di-browser', () => ({
  CoreStart: (key: string) => `core:${key}`,
  useService: (key: string) => {
    switch (key) {
      case 'core:http':
        return { basePath: { prepend: (path: string) => path } };
      case 'core:notifications':
        return {
          toasts: {
            addWarning: jest.fn(),
            addInfo: jest.fn(),
            addDanger: mockAddDanger,
            addError: mockAddError,
          },
        };
      case 'core:application':
        return { navigateToUrl: mockNavigateToUrl };
      case 'core:i18n':
        return {};
      case 'core:theme':
        return {};
      default:
        return {};
    }
  },
}));

import { useComposeDiscoverFlyout } from './use_compose_discover_flyout';

const editRule = {
  id: 'rule-1',
  metadata: { name: 'My rule' },
} as unknown as RuleApiResponse;

const updatedRule = {
  id: 'rule-1',
  metadata: { name: 'My rule (updated)' },
} as unknown as RuleApiResponse;

const createdRule = {
  id: 'rule-new',
  metadata: { name: 'My rule' },
} as unknown as RuleApiResponse;

const REDIRECT_PATH = '/app/alerting_v2/rules';

const existingAction = { id: 'a1', source: 'existing' as const, workflowId: 'wf-1' };

let hookApi: ReturnType<typeof useComposeDiscoverFlyout> | undefined;

const Harness = ({ redirectPath }: { redirectPath?: string }) => {
  const api = useComposeDiscoverFlyout({ createSuccessRedirectPath: redirectPath });
  hookApi = api;
  return <>{api.flyout}</>;
};

const renderAndOpenCreate = async (redirectPath?: string) => {
  render(<Harness redirectPath={redirectPath} />);
  act(() => {
    hookApi!.openCreateFlyout();
  });
  await waitFor(() => {
    expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
  });
};

const callOnCreateRule = async (notifications?: unknown) => {
  const onCreateRule = capturedFlyoutProps.onCreateRule as (
    payload: unknown,
    notifications?: unknown
  ) => Promise<void>;
  await act(async () => {
    await onCreateRule({ metadata: { name: 'My rule' } }, notifications);
  });
};

const renderAndOpenEdit = async () => {
  render(<Harness />);
  act(() => {
    hookApi!.openEditFlyout(editRule);
  });
  await waitFor(() => {
    expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
  });
};

const callOnUpdateRule = async (notifications?: unknown) => {
  const onUpdateRule = capturedFlyoutProps.onUpdateRule as (
    id: string,
    payload: unknown,
    notifications?: unknown
  ) => Promise<void>;
  await act(async () => {
    await onUpdateRule('rule-1', { metadata: { name: 'My rule (updated)' } }, notifications);
  });
};

describe('useComposeDiscoverFlyout — create submission wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedFlyoutProps = {};
    hookApi = undefined;
    mockCreateMutateAsync.mockResolvedValue(createdRule);
  });

  it('opens in create mode with no ruleId and provides onCreateRule', async () => {
    await renderAndOpenCreate();

    expect(capturedFlyoutProps.mode).toBe('create');
    expect(capturedFlyoutProps.ruleId).toBeUndefined();
    expect(capturedFlyoutProps.onCreateRule).toBeDefined();
    expect(capturedFlyoutProps.onProvideQueryStepNavigator).toBeDefined();
  });

  it('creates the rule then sets up notifications and redirects on success', async () => {
    mockSetupMutate.mockImplementation((_vars, opts) => opts?.onSuccess?.());

    await renderAndOpenCreate(REDIRECT_PATH);
    await callOnCreateRule({ workflows: [existingAction] });

    expect(mockCreateMutateAsync).toHaveBeenCalledWith({ metadata: { name: 'My rule' } });
    expect(mockSetupMutate).toHaveBeenCalledWith(
      { rule: createdRule, actions: [existingAction] },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );

    await waitFor(() => {
      expect(mockNavigateToUrl).toHaveBeenCalledWith(REDIRECT_PATH);
      expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();
    });
  });

  it('still redirects when notification setup fails (unlike edit, which stays open)', async () => {
    mockSetupMutate.mockImplementation((_vars, opts) => opts?.onError?.(new Error('setup failed')));

    await renderAndOpenCreate(REDIRECT_PATH);
    await callOnCreateRule({ workflows: [existingAction] });

    expect(mockSetupMutate).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mockNavigateToUrl).toHaveBeenCalledWith(REDIRECT_PATH);
      expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();
    });
  });

  it('redirects without setting up notifications when there are no actions', async () => {
    await renderAndOpenCreate(REDIRECT_PATH);
    await callOnCreateRule(undefined);

    expect(mockCreateMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockSetupMutate).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(mockNavigateToUrl).toHaveBeenCalledWith(REDIRECT_PATH);
      expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();
    });
  });

  it('shows a Review query toast action on create 400 and rethrows', async () => {
    const error = Object.assign(new Error('bad request'), {
      response: { status: 400 },
    });
    mockCreateMutateAsync.mockRejectedValue(error);

    await renderAndOpenCreate(REDIRECT_PATH);
    await expect(callOnCreateRule(undefined)).rejects.toBe(error);

    expect(mockAddDanger).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Rule not created',
      })
    );
    expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
  });
});

describe('useComposeDiscoverFlyout — edit submission wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedFlyoutProps = {};
    hookApi = undefined;
    mockUpdateMutateAsync.mockResolvedValue(updatedRule);
  });

  it('passes ruleId only in edit mode and provides onUpdateRule', async () => {
    await renderAndOpenEdit();

    expect(capturedFlyoutProps.mode).toBe('edit');
    expect(capturedFlyoutProps.ruleId).toBe('rule-1');
    expect(capturedFlyoutProps.onUpdateRule).toBeDefined();
  });

  it('updates the rule then sets up notifications and closes on success', async () => {
    mockSetupMutate.mockImplementation((_vars, opts) => opts?.onSuccess?.());

    await renderAndOpenEdit();
    await callOnUpdateRule({ workflows: [existingAction] });

    expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
      id: 'rule-1',
      payload: { metadata: { name: 'My rule (updated)' } },
    });
    expect(mockSetupMutate).toHaveBeenCalledWith(
      { rule: updatedRule, actions: [existingAction] },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );

    await waitFor(() => {
      expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();
    });
  });

  it('keeps the flyout open when notification setup does not succeed', async () => {
    mockSetupMutate.mockImplementation(() => undefined);

    await renderAndOpenEdit();
    await callOnUpdateRule({ workflows: [existingAction] });

    expect(mockSetupMutate).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
  });

  it('closes without setting up notifications when there are no actions', async () => {
    await renderAndOpenEdit();
    await callOnUpdateRule(undefined);

    expect(mockUpdateMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockSetupMutate).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();
    });
  });

  it('does not set up notifications when the workflows list is empty', async () => {
    await renderAndOpenEdit();
    await callOnUpdateRule({ workflows: [] });

    expect(mockSetupMutate).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();
    });
  });
});

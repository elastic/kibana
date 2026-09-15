/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import type { RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import type { RuleApiResponse } from '../services/rules_api';

const mockCreateMutate = jest.fn();
const mockUpdateMutate = jest.fn();
const mockSetupMutate = jest.fn();
const mockRulesUpdateRule = jest.fn();

let capturedFlyoutProps: Record<string, unknown> = {};

const mockParseState = jest.fn();

jest.mock('@kbn/alerting-v2-rule-form', () => ({
  ComposeDiscoverFlyout: (props: Record<string, unknown>) => {
    capturedFlyoutProps = props;
    return <div data-test-subj="mockComposeDiscoverFlyout" />;
  },
  RULE_BUILDER_REGISTRY: {
    threshold: { parseState: (...args: unknown[]) => mockParseState(...args) },
  },
  resolveRuleNotificationTag: jest.fn().mockReturnValue('notify-my-rule'),
  ruleHasNotificationTag: jest
    .fn()
    .mockImplementation((metadata: { tags?: string[] }) => Boolean(metadata?.tags?.[0]?.trim())),
}));

jest.mock('@kbn/alerting-v2-schemas', () => ({
  getBreachEsqlQuery: (query: unknown) =>
    typeof query === 'object' && query !== null && 'breach' in (query as Record<string, unknown>)
      ? (query as Record<string, unknown>).breach
      : '',
  getRecoverEsqlQuery: () => undefined,
}));

jest.mock('./use_create_rule', () => ({
  useCreateRule: () => ({ mutate: mockCreateMutate, isLoading: false }),
}));
jest.mock('./use_update_rule', () => ({
  useUpdateRule: () => ({ mutate: mockUpdateMutate, isLoading: false }),
}));
jest.mock('./use_setup_rule_notifications', () => ({
  useSetupRuleNotifications: () => ({ mutate: mockSetupMutate, isLoading: false }),
}));

const mockNavigateToUrl = jest.fn();
const mockAddWarning = jest.fn();

jest.mock('@kbn/core-di', () => ({
  PluginStart: (key: string) => `plugin:${key}`,
}));
jest.mock('@kbn/core-di-browser', () => ({
  CoreStart: (key: string) => `core:${key}`,
  useService: (key: unknown) => {
    if (typeof key === 'function' && (key as { name?: string }).name === 'RulesApi') {
      return { updateRule: mockRulesUpdateRule };
    }
    switch (key) {
      case 'core:http':
        return { basePath: { prepend: (path: string) => path } };
      case 'core:notifications':
        return { toasts: { addWarning: mockAddWarning, addInfo: jest.fn() } };
      case 'core:application':
        return { navigateToUrl: mockNavigateToUrl };
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

const taggedUpdatedRule = {
  id: 'rule-1',
  metadata: { name: 'My rule (updated)', tags: ['notify-my-rule'] },
} as unknown as RuleApiResponse;

const taggedAlreadyUpdatedRule = {
  id: 'rule-1',
  metadata: { name: 'My rule (updated)', tags: ['production'] },
} as unknown as RuleApiResponse;

const createdRule = {
  id: 'rule-new',
  metadata: { name: 'My rule' },
} as unknown as RuleApiResponse;

const taggedCreatedRule = {
  id: 'rule-new',
  metadata: { name: 'My rule', tags: ['notify-my-rule'] },
} as unknown as RuleApiResponse;

const REDIRECT_PATH = '/app/alerting_v2/rules';

const existingAction = { id: 'a1', source: 'existing' as const, workflowId: 'wf-1' };

let hookApi: ReturnType<typeof useComposeDiscoverFlyout> | undefined;

const Harness = ({
  redirectPath,
  historyKey,
  onCreateSuccess,
  onDismiss,
}: {
  redirectPath?: string;
  historyKey?: symbol;
  onCreateSuccess?: () => void;
  onDismiss?: () => void;
}) => {
  const api = useComposeDiscoverFlyout({
    createSuccessRedirectPath: redirectPath,
    historyKey,
    onCreateSuccess,
    onDismiss,
  });
  hookApi = api;
  return (
    <>
      {api.flyout}
      {api.confirmationModal}
    </>
  );
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

const callOnCreateRule = (notifications?: unknown) => {
  const onCreateRule = capturedFlyoutProps.onCreateRule as (
    payload: unknown,
    notifications?: unknown
  ) => void;
  act(() => {
    onCreateRule({ metadata: { name: 'My rule' } }, notifications);
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

const callOnUpdateRule = (notifications?: unknown) => {
  const onUpdateRule = capturedFlyoutProps.onUpdateRule as (
    id: string,
    payload: unknown,
    notifications?: unknown
  ) => void;
  act(() => {
    onUpdateRule('rule-1', { metadata: { name: 'My rule (updated)' } }, notifications);
  });
};

describe('useComposeDiscoverFlyout — create submission wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedFlyoutProps = {};
    hookApi = undefined;
    mockCreateMutate.mockImplementation((_payload, opts) => opts?.onSuccess?.(createdRule));
    mockRulesUpdateRule.mockResolvedValue(taggedCreatedRule);
  });

  it('opens in create mode with no ruleId and provides onCreateRule', async () => {
    await renderAndOpenCreate();

    expect(capturedFlyoutProps.mode).toBe('create');
    expect(capturedFlyoutProps.ruleId).toBeUndefined();
    expect(capturedFlyoutProps.onCreateRule).toBeDefined();
  });

  it('writes notification tag to untagged rule before setting up notifications', async () => {
    mockSetupMutate.mockImplementation((_vars, opts) => opts?.onSuccess?.());

    await renderAndOpenCreate(REDIRECT_PATH);
    callOnCreateRule({ workflows: [existingAction] });

    await waitFor(() => {
      expect(mockRulesUpdateRule).toHaveBeenCalledWith('rule-new', {
        metadata: { tags: ['notify-my-rule'] },
      });
      expect(mockSetupMutate).toHaveBeenCalledWith(
        { rule: taggedCreatedRule, actions: [existingAction] },
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
      );
      expect(mockNavigateToUrl).toHaveBeenCalledWith(REDIRECT_PATH);
      expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();
    });
  });

  it('skips rule tag update when rule already has tags', async () => {
    const alreadyTaggedRule = {
      id: 'rule-new',
      metadata: { name: 'My rule', tags: ['production'] },
    } as unknown as RuleApiResponse;
    mockCreateMutate.mockImplementation((_payload, opts) => opts?.onSuccess?.(alreadyTaggedRule));
    mockSetupMutate.mockImplementation((_vars, opts) => opts?.onSuccess?.());

    await renderAndOpenCreate(REDIRECT_PATH);
    callOnCreateRule({ workflows: [existingAction] });

    await waitFor(() => {
      expect(mockRulesUpdateRule).not.toHaveBeenCalled();
      expect(mockSetupMutate).toHaveBeenCalledWith(
        { rule: alreadyTaggedRule, actions: [existingAction] },
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
      );
      expect(mockNavigateToUrl).toHaveBeenCalledWith(REDIRECT_PATH);
    });
  });

  it('shows warning toast and redirects without setup when tag update fails', async () => {
    mockRulesUpdateRule.mockRejectedValue(new Error('patch failed'));

    await renderAndOpenCreate(REDIRECT_PATH);
    callOnCreateRule({ workflows: [existingAction] });

    await waitFor(() => {
      expect(mockAddWarning).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.any(String) })
      );
      expect(mockSetupMutate).not.toHaveBeenCalled();
      expect(mockNavigateToUrl).toHaveBeenCalledWith(REDIRECT_PATH);
    });
  });

  it('still redirects when notification setup fails (unlike edit, which stays open)', async () => {
    mockSetupMutate.mockImplementation((_vars, opts) => opts?.onError?.(new Error('setup failed')));

    await renderAndOpenCreate(REDIRECT_PATH);
    callOnCreateRule({ workflows: [existingAction] });

    await waitFor(() => {
      expect(mockSetupMutate).toHaveBeenCalledTimes(1);
      expect(mockNavigateToUrl).toHaveBeenCalledWith(REDIRECT_PATH);
      expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();
    });
  });

  it('redirects without setting up notifications when there are no actions', async () => {
    await renderAndOpenCreate(REDIRECT_PATH);
    callOnCreateRule(undefined);

    expect(mockCreateMutate).toHaveBeenCalledTimes(1);
    expect(mockSetupMutate).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(mockNavigateToUrl).toHaveBeenCalledWith(REDIRECT_PATH);
      expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();
    });
  });
});

describe('useComposeDiscoverFlyout — edit submission wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedFlyoutProps = {};
    hookApi = undefined;
    // The rule update is an idempotent PATCH; default it to succeed with the updated rule.
    mockUpdateMutate.mockImplementation((_vars, opts) => opts?.onSuccess?.(updatedRule));
    // Default: write the notification tag to the (tagless) updated rule.
    mockRulesUpdateRule.mockResolvedValue(taggedUpdatedRule);
  });

  it('passes ruleId only in edit mode and provides onUpdateRule', async () => {
    await renderAndOpenEdit();

    expect(capturedFlyoutProps.mode).toBe('edit');
    expect(capturedFlyoutProps.ruleId).toBe('rule-1');
    expect(capturedFlyoutProps.onUpdateRule).toBeDefined();
  });

  it('writes notification tag to tagless rule before setting up notifications', async () => {
    mockSetupMutate.mockImplementation((_vars, opts) => opts?.onSuccess?.());

    await renderAndOpenEdit();
    callOnUpdateRule({ workflows: [existingAction] });

    await waitFor(() => {
      expect(mockRulesUpdateRule).toHaveBeenCalledWith('rule-1', {
        metadata: { tags: ['notify-my-rule'] },
      });
      expect(mockSetupMutate).toHaveBeenCalledWith(
        { rule: taggedUpdatedRule, actions: [existingAction] },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
      expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();
    });
  });

  it('skips rule tag update when rule already has a non-blank tag', async () => {
    mockUpdateMutate.mockImplementation((_vars, opts) =>
      opts?.onSuccess?.(taggedAlreadyUpdatedRule)
    );
    mockSetupMutate.mockImplementation((_vars, opts) => opts?.onSuccess?.());

    await renderAndOpenEdit();
    callOnUpdateRule({ workflows: [existingAction] });

    await waitFor(() => {
      expect(mockRulesUpdateRule).not.toHaveBeenCalled();
      expect(mockSetupMutate).toHaveBeenCalledWith(
        { rule: taggedAlreadyUpdatedRule, actions: [existingAction] },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });
  });

  it('shows warning toast and closes flyout when tag write fails', async () => {
    mockRulesUpdateRule.mockRejectedValue(new Error('patch failed'));

    await renderAndOpenEdit();
    callOnUpdateRule({ workflows: [existingAction] });

    await waitFor(() => {
      expect(mockAddWarning).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.any(String) })
      );
      expect(mockSetupMutate).not.toHaveBeenCalled();
      expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();
    });
  });

  it('also writes tag for a rule whose only tags are blank', async () => {
    const blankTagRule = {
      id: 'rule-1',
      metadata: { name: 'My rule (updated)', tags: ['  '] },
    } as unknown as RuleApiResponse;
    mockUpdateMutate.mockImplementation((_vars, opts) => opts?.onSuccess?.(blankTagRule));
    mockSetupMutate.mockImplementation((_vars, opts) => opts?.onSuccess?.());

    await renderAndOpenEdit();
    callOnUpdateRule({ workflows: [existingAction] });

    await waitFor(() => {
      expect(mockRulesUpdateRule).toHaveBeenCalledWith('rule-1', {
        metadata: { tags: ['notify-my-rule'] },
      });
    });
  });

  it('keeps the flyout open when notification setup does not succeed', async () => {
    mockSetupMutate.mockImplementation(() => undefined);

    await renderAndOpenEdit();
    callOnUpdateRule({ workflows: [existingAction] });

    await waitFor(() => {
      expect(mockSetupMutate).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
  });

  it('keeps the flyout open when notification setup fails so the user can retry', async () => {
    mockSetupMutate.mockImplementation((_vars, opts) => opts?.onError?.(new Error('setup failed')));

    await renderAndOpenEdit();
    callOnUpdateRule({ workflows: [existingAction] });

    await waitFor(() => {
      expect(mockSetupMutate).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
  });

  it('closes without setting up notifications when there are no actions', async () => {
    await renderAndOpenEdit();
    callOnUpdateRule(undefined);

    expect(mockUpdateMutate).toHaveBeenCalledTimes(1);
    expect(mockSetupMutate).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();
    });
  });

  it('does not set up notifications when the workflows list is empty', async () => {
    await renderAndOpenEdit();
    callOnUpdateRule({ workflows: [] });

    expect(mockSetupMutate).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();
    });
  });
});

describe('useComposeDiscoverFlyout — builder-to-ES|QL confirmation', () => {
  const builderRule = {
    id: 'rule-builder',
    metadata: { name: 'Builder rule', builder_type: 'threshold' },
    query: { format: 'standalone', breach: 'FROM logs-* | STATS count() | WHERE count > 5' },
    recovery_strategy: null,
    time_field: '@timestamp',
  } as unknown as RuleApiResponse;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedFlyoutProps = {};
    hookApi = undefined;
  });

  it('shows confirmation modal when builder rule query cannot be parsed', async () => {
    mockParseState.mockReturnValue(null);
    render(<Harness />);

    act(() => {
      hookApi!.openEditFlyout(builderRule);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();
      expect(screen.getByTestId('alertingV2ConfirmBuilderToEsqlModal')).toBeInTheDocument();
    });
  });

  it('opens flyout in ES|QL mode after confirmation', async () => {
    mockParseState.mockReturnValue(null);
    render(<Harness />);

    act(() => {
      hookApi!.openEditFlyout(builderRule);
    });

    await waitFor(() => {
      expect(screen.getByTestId('alertingV2ConfirmBuilderToEsqlModal')).toBeInTheDocument();
    });

    act(() => {
      screen.getByText('Open in ES|QL mode').click();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('alertingV2ConfirmBuilderToEsqlModal')).not.toBeInTheDocument();
      expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
    });

    expect(capturedFlyoutProps.builderType).toBeUndefined();
    expect(capturedFlyoutProps.mode).toBe('edit');
  });

  it('does not open flyout when user cancels confirmation', async () => {
    mockParseState.mockReturnValue(null);
    render(<Harness />);

    act(() => {
      hookApi!.openEditFlyout(builderRule);
    });

    await waitFor(() => {
      expect(screen.getByTestId('alertingV2ConfirmBuilderToEsqlModal')).toBeInTheDocument();
    });

    act(() => {
      screen.getByText('Cancel').click();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('alertingV2ConfirmBuilderToEsqlModal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();
    });
  });

  it('opens directly in builder mode when parse succeeds', async () => {
    mockParseState.mockReturnValue({ stats: [{ fn: 'count', alias: 'count' }] });
    render(<Harness />);

    act(() => {
      hookApi!.openEditFlyout(builderRule);
    });

    await waitFor(() => {
      expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
    });

    expect(capturedFlyoutProps.builderType).toBe('threshold');
    expect(screen.queryByTestId('alertingV2ConfirmBuilderToEsqlModal')).not.toBeInTheDocument();
  });
});

describe('useComposeDiscoverFlyout — stacked create session', () => {
  const sharedHistoryKey = Symbol('rulesListCreateRule');

  beforeEach(() => {
    jest.clearAllMocks();
    capturedFlyoutProps = {};
    hookApi = undefined;
    mockCreateMutate.mockImplementation((_payload, opts) => opts?.onSuccess?.(createdRule));
  });

  it('passes the shared historyKey for a fresh create', async () => {
    render(<Harness historyKey={sharedHistoryKey} />);
    act(() => {
      hookApi!.openCreateFlyout();
    });
    await waitFor(() => {
      expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
    });

    expect(capturedFlyoutProps.historyKey).toBe(sharedHistoryKey);
  });

  it('does not use the shared historyKey in edit mode', async () => {
    render(<Harness historyKey={sharedHistoryKey} />);
    act(() => {
      hookApi!.openEditFlyout(editRule);
    });
    await waitFor(() => {
      expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
    });

    expect(capturedFlyoutProps.historyKey).not.toBe(sharedHistoryKey);
  });

  it('does not use the shared historyKey in clone mode', async () => {
    render(<Harness historyKey={sharedHistoryKey} />);
    act(() => {
      hookApi!.openCloneFlyout(editRule);
    });
    await waitFor(() => {
      expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
    });

    expect(capturedFlyoutProps.historyKey).not.toBe(sharedHistoryKey);
    expect(capturedFlyoutProps.mode).toBe('clone');
  });

  it('uses the shared historyKey for a template-seeded create', async () => {
    render(<Harness historyKey={sharedHistoryKey} />);
    act(() => {
      hookApi!.openCreateFromTemplateFlyout({
        rule: { metadata: { name: 'From template' } },
      } as RuleTemplateResponse);
    });
    await waitFor(() => {
      expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
    });

    expect(capturedFlyoutProps.historyKey).toBe(sharedHistoryKey);
    expect(capturedFlyoutProps.mode).toBe('create');
  });

  it('calls onCreateSuccess after a successful create', async () => {
    const onCreateSuccess = jest.fn();
    render(<Harness historyKey={sharedHistoryKey} onCreateSuccess={onCreateSuccess} />);
    act(() => {
      hookApi!.openCreateFlyout();
    });
    await waitFor(() => {
      expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
    });

    callOnCreateRule(undefined);

    await waitFor(() => {
      expect(onCreateSuccess).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();
    });
  });

  it('calls onDismiss when the authoring flyout is dismissed', async () => {
    const onDismiss = jest.fn();
    render(<Harness historyKey={sharedHistoryKey} onDismiss={onDismiss} />);
    act(() => {
      hookApi!.openCreateFlyout();
    });
    await waitFor(() => {
      expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
    });

    act(() => {
      (capturedFlyoutProps.onClose as () => void)();
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();
  });

  it('does not call onDismiss when closeFlyout runs without callOnDismiss', async () => {
    const onDismiss = jest.fn();
    render(<Harness historyKey={sharedHistoryKey} onDismiss={onDismiss} />);
    act(() => {
      hookApi!.openCreateFlyout();
    });
    await waitFor(() => {
      expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
    });

    act(() => {
      hookApi!.closeFlyout();
    });

    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();
  });

  it('does not call onDismiss after a successful rule update', async () => {
    const onDismiss = jest.fn();
    mockUpdateMutate.mockImplementation((_vars, opts) => opts?.onSuccess?.(updatedRule));
    render(<Harness historyKey={sharedHistoryKey} onDismiss={onDismiss} />);
    act(() => {
      hookApi!.openEditFlyout(editRule);
    });
    await waitFor(() => {
      expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
    });

    callOnUpdateRule(undefined);

    await waitFor(() => {
      expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();
    });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('calls onDismiss when closeFlyout is given callOnDismiss', async () => {
    const onDismiss = jest.fn();
    render(<Harness historyKey={sharedHistoryKey} onDismiss={onDismiss} />);
    act(() => {
      hookApi!.openCreateFlyout();
    });
    await waitFor(() => {
      expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
    });

    act(() => {
      hookApi!.closeFlyout({ callOnDismiss: true });
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();
  });

  it('unmounts the form on history back without dismissing the picker, and can reopen', async () => {
    const onDismiss = jest.fn();
    render(<Harness historyKey={sharedHistoryKey} onDismiss={onDismiss} />);
    act(() => {
      hookApi!.openCreateFlyout();
    });
    await waitFor(() => {
      expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
    });

    act(() => {
      (capturedFlyoutProps.onHistoryBack as () => void)();
    });

    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();

    act(() => {
      hookApi!.openCreateFlyout();
    });
    await waitFor(() => {
      expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
    });
  });
});

describe('useComposeDiscoverFlyout — builder fallback and close request', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedFlyoutProps = {};
    hookApi = undefined;
  });

  it('falls back to ES|QL create when the builder type is unknown', async () => {
    render(<Harness />);

    act(() => {
      hookApi!.openCreateBuilderFlyout('not-a-builder');
    });

    await waitFor(() => {
      expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
    });

    expect(capturedFlyoutProps.builderType).toBeUndefined();
    expect(capturedFlyoutProps.mode).toBe('create');
    expect(mockAddWarning).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.any(String) })
    );
  });

  it('increments closeGeneration when requestClose is called', async () => {
    await renderAndOpenCreate();

    expect(capturedFlyoutProps.closeGeneration).toBe(0);

    act(() => {
      hookApi!.requestClose();
    });

    expect(capturedFlyoutProps.closeGeneration).toBe(1);
  });
});

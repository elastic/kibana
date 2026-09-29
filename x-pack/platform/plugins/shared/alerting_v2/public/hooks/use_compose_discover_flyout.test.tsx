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
}));

jest.mock('@kbn/alerting-v2-schemas', () => ({
  getBreachEsqlQuery: (query: { base?: string; breach?: { segment: string } } | null) =>
    query?.breach ? `${query.base} | ${query.breach.segment}` : query?.base ?? '',
  getRecoverEsqlQuery: () => undefined,
}));

jest.mock('./use_create_rule', () => ({
  useCreateRule: () => ({ mutate: mockCreateMutate, isLoading: false }),
}));
jest.mock('./use_update_rule', () => ({
  useUpdateRule: () => ({ mutate: mockUpdateMutate, isLoading: false }),
}));
let mockCreateActionPolicyDisabledReason: string | undefined;
jest.mock('./use_create_action_policy_disabled_reason', () => ({
  useCreateActionPolicyDisabledReason: () => mockCreateActionPolicyDisabledReason,
}));

const mockActionPolicyGetRedirectUrl = jest.fn(
  ({ actionPolicyId }: { actionPolicyId: string }) =>
    `/app/alerting_v2/action-policies/edit/${actionPolicyId}`
);
jest.mock('../application/locator_context', () => ({
  useAlertingLocators: () => ({
    actionPolicyLocators: { getRedirectUrl: mockActionPolicyGetRedirectUrl },
  }),
}));

const mockNavigateToUrl = jest.fn();
const mockAddWarning = jest.fn();

jest.mock('@kbn/core-di', () => ({
  PluginStart: (key: string) => `plugin:${key}`,
}));
jest.mock('@kbn/core-di-browser', () => ({
  CoreStart: (key: string) => `core:${key}`,
  useService: (key: unknown) => {
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

const REDIRECT_PATH = '/app/alerting_v2/rules';

let hookApi: ReturnType<typeof useComposeDiscoverFlyout> | undefined;

const Harness = ({ redirectPath }: { redirectPath?: string }) => {
  const api = useComposeDiscoverFlyout({ createSuccessRedirectPath: redirectPath });
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

const callOnCreateRule = () => {
  const onCreateRule = capturedFlyoutProps.onCreateRule as (payload: unknown) => void;
  act(() => {
    onCreateRule({ metadata: { name: 'My rule' } });
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

const callOnUpdateRule = () => {
  const onUpdateRule = capturedFlyoutProps.onUpdateRule as (id: string, payload: unknown) => void;
  act(() => {
    onUpdateRule('rule-1', { metadata: { name: 'My rule (updated)' } });
  });
};

beforeEach(() => {
  mockCreateActionPolicyDisabledReason = undefined;
});

describe('useComposeDiscoverFlyout — create submission wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedFlyoutProps = {};
    hookApi = undefined;
    mockCreateMutate.mockImplementation((_payload, opts) => opts?.onSuccess?.());
  });

  it('opens in create mode with no ruleId and provides onCreateRule', async () => {
    await renderAndOpenCreate();

    expect(capturedFlyoutProps.mode).toBe('create');
    expect(capturedFlyoutProps.ruleId).toBeUndefined();
    expect(capturedFlyoutProps.onCreateRule).toBeDefined();
  });

  it('redirects and closes flyout after rule creation', async () => {
    await renderAndOpenCreate(REDIRECT_PATH);
    callOnCreateRule();

    expect(mockCreateMutate).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mockNavigateToUrl).toHaveBeenCalledWith(REDIRECT_PATH);
      expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();
    });
  });
});

describe('useComposeDiscoverFlyout — create from template wiring', () => {
  const template = {
    id: 'template-1',
    engine: 'v2',
    rule: {
      kind: 'signal',
      metadata: { name: 'CPU usage' },
      time_field: '@timestamp',
      schedule: { every: '1m', lookback: '5m' },
      query: { base: 'FROM logs-*' },
    },
  } as unknown as RuleTemplateResponse;

  const openFromTemplate = async () => {
    render(<Harness />);
    act(() => {
      hookApi!.openCreateFromTemplateFlyout(template);
    });
    await waitFor(() => {
      expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    capturedFlyoutProps = {};
    hookApi = undefined;
    mockCreateMutate.mockImplementation((_vars, opts) => opts?.onSuccess?.());
  });

  it('saves the edited rule through the install API for the opened template', async () => {
    await openFromTemplate();
    callOnCreateRule();

    expect(mockCreateMutate).toHaveBeenCalledWith(
      {
        payload: {
          metadata: {
            name: 'My rule',
            source: { type: 'template', id: 'template-1', version: 1 },
          },
        },
        templateId: 'template-1',
      },
      expect.any(Object)
    );
  });

  it('does not carry the template over to a rule created afterwards', async () => {
    await openFromTemplate();
    act(() => {
      hookApi!.openCreateFlyout();
    });
    callOnCreateRule();

    expect(mockCreateMutate).toHaveBeenCalledWith(
      { payload: { metadata: { name: 'My rule' } }, templateId: undefined },
      expect.any(Object)
    );
  });

  it('does not carry the template over after the flyout is closed', async () => {
    await openFromTemplate();
    act(() => {
      (capturedFlyoutProps.onClose as () => void)();
    });
    await waitFor(() => {
      expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();
    });
    act(() => {
      hookApi!.openCreateFlyout();
    });
    await waitFor(() => {
      expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
    });
    callOnCreateRule();

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: undefined }),
      expect.any(Object)
    );
  });

  it('creates without a template when the flyout was not opened from one', async () => {
    await renderAndOpenCreate();
    callOnCreateRule();

    expect(mockCreateMutate).toHaveBeenCalledWith(
      { payload: { metadata: { name: 'My rule' } }, templateId: undefined },
      expect.any(Object)
    );
  });
});

describe('useComposeDiscoverFlyout — action policy creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedFlyoutProps = {};
    hookApi = undefined;
  });

  it('passes why action policy creation is disabled to the rule form services', async () => {
    const disabledReason = 'Action policy creation is disabled';
    mockCreateActionPolicyDisabledReason = disabledReason;

    await renderAndOpenCreate();

    expect(capturedFlyoutProps.services).toHaveProperty(
      'createActionPolicyDisabledReason',
      disabledReason
    );
  });

  it('injects a host-aware action policy edit href builder into the rule form services', async () => {
    await renderAndOpenCreate();

    const services = capturedFlyoutProps.services as {
      getActionPolicyEditHref: (id: string) => string;
    };
    expect(services.getActionPolicyEditHref('ap-1')).toBe(
      '/app/alerting_v2/action-policies/edit/ap-1'
    );
    expect(mockActionPolicyGetRedirectUrl).toHaveBeenCalledWith({
      page: 'edit',
      actionPolicyId: 'ap-1',
    });
  });
});

describe('useComposeDiscoverFlyout — create-from-template source stamping (step 4.3)', () => {
  const templateId = 'tpl-abc-123';
  const template = {
    id: templateId,
    engine: 'v2' as const,
    rule: {
      kind: 'alert' as const,
      metadata: { name: 'Template rule' },
      time_field: '@timestamp',
      schedule: { every: '5m', lookback: '10m' },
      query: { base: 'FROM logs-* | LIMIT 10' },
      recovery: { strategy: 'no_breach' as const },
      no_data: { strategy: 'ignore' as const },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    capturedFlyoutProps = {};
    hookApi = undefined;
    mockCreateMutate.mockImplementation((_payload, opts) => opts?.onSuccess?.());
  });

  it('stamps { type: template, id } on the create payload when opened from a template', async () => {
    render(<Harness />);
    act(() => {
      hookApi!.openCreateFromTemplateFlyout(template);
    });
    await waitFor(() => {
      expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
    });

    // Simulate the flyout calling onCreateRule with a payload that has no source
    // (as composeFormToCreateRequest produces).
    const onCreateRule = capturedFlyoutProps.onCreateRule as (
      payload: unknown,
      notifications?: unknown
    ) => void;
    act(() => {
      onCreateRule({ metadata: { name: 'My rule' } }, undefined);
    });

    expect(mockCreateMutate).toHaveBeenCalledWith(
      {
        payload: {
          metadata: {
            name: 'My rule',
            source: { type: 'template', id: templateId, version: 1 },
          },
        },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it('does NOT stamp template source when opened via openCreateFlyout', async () => {
    render(<Harness />);
    act(() => {
      hookApi!.openCreateFlyout();
    });
    await waitFor(() => {
      expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
    });

    const onCreateRule = capturedFlyoutProps.onCreateRule as (
      payload: unknown,
      notifications?: unknown
    ) => void;
    act(() => {
      onCreateRule({ metadata: { name: 'My rule' } }, undefined);
    });

    expect(mockCreateMutate).toHaveBeenCalledWith(
      { payload: { metadata: { name: 'My rule' } } },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });
});
describe('useComposeDiscoverFlyout — edit submission wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedFlyoutProps = {};
    hookApi = undefined;
    mockUpdateMutate.mockImplementation((_vars, opts) => opts?.onSuccess?.());
  });

  it('passes ruleId only in edit mode and provides onUpdateRule', async () => {
    await renderAndOpenEdit();

    expect(capturedFlyoutProps.mode).toBe('edit');
    expect(capturedFlyoutProps.ruleId).toBe('rule-1');
    expect(capturedFlyoutProps.onUpdateRule).toBeDefined();
  });

  it('closes flyout after rule update', async () => {
    await renderAndOpenEdit();
    callOnUpdateRule();

    expect(mockUpdateMutate).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.queryByTestId('mockComposeDiscoverFlyout')).not.toBeInTheDocument();
    });
  });
});

describe('useComposeDiscoverFlyout — builder-to-ES|QL confirmation', () => {
  const builderRule = {
    id: 'rule-builder',
    metadata: { name: 'Builder rule', builder: { type: 'threshold' } },
    query: { base: 'FROM logs-* | STATS count() | WHERE count > 5' },
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

describe('useComposeDiscoverFlyout — session history', () => {
  const sharedKey = Symbol('picker');

  const SessionHarness = ({ historyKey }: { historyKey?: symbol }) => {
    const api = useComposeDiscoverFlyout({ historyKey });
    hookApi = api;
    return <>{api.flyout}</>;
  };

  beforeEach(() => {
    capturedFlyoutProps = {};
    hookApi = undefined;
  });

  it('uses the shared key only when one is provided at open', () => {
    render(<SessionHarness historyKey={sharedKey} />);

    act(() => {
      hookApi!.openCreateFlyout();
    });

    expect(capturedFlyoutProps.historyKey).toBe(sharedKey);
    expect(capturedFlyoutProps.stackedOnPicker).toBe(true);
  });

  it('keeps a private key when the picker opens after the form', () => {
    const view = render(<SessionHarness />);

    act(() => {
      hookApi!.openCreateFlyout();
    });
    const keyWhilePickerClosed = capturedFlyoutProps.historyKey;
    expect(keyWhilePickerClosed).not.toBe(sharedKey);
    expect(capturedFlyoutProps.stackedOnPicker).toBe(false);

    view.rerender(<SessionHarness historyKey={sharedKey} />);

    expect(capturedFlyoutProps.historyKey).toBe(keyWhilePickerClosed);
    expect(capturedFlyoutProps.stackedOnPicker).toBe(false);
  });

  it('clears the previous builder seed when opening ES|QL', () => {
    render(<SessionHarness />);

    act(() => {
      hookApi!.openCreateBuilderFlyout('threshold');
    });
    expect(capturedFlyoutProps.builderType).toBe('threshold');

    act(() => {
      hookApi!.openCreateFlyout();
    });

    expect(capturedFlyoutProps.builderType).toBeUndefined();
    expect(capturedFlyoutProps.initialBuilderState).toBeUndefined();
    expect(capturedFlyoutProps.rule).toBeUndefined();
  });
});

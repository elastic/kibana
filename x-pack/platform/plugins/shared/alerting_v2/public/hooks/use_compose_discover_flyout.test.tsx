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

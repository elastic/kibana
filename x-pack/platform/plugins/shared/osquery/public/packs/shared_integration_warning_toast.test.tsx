/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient } from '@kbn/react-query';
import { I18nProvider } from '@kbn/i18n-react';

import type { SharedIntegrationWarning } from '../../common/api/packs/shared_integration_warning';
import { addSharedIntegrationWarningToasts } from './shared_integration_warning_toast';

jest.mock('@kbn/react-kibana-mount', () => ({
  // Hand the React node back unchanged so tests can render it directly.
  toMountPoint: (node: React.ReactNode) => node,
}));

const getUrlForApp = jest.fn(
  (app: string, { path }: { path?: string } = {}) => `/app/${app}${path}`
);

const navigateToApp = jest.fn();

const names: Record<string, string> = {
  'policy-a': 'Policy A',
  'policy-b': 'Policy B',
  'policy-c': 'Policy C',
  'policy-d': 'Policy D',
  'policy-e': 'Policy E',
};

const warning = (
  additional: string[],
  overrides: Partial<SharedIntegrationWarning> = {}
): SharedIntegrationWarning => ({
  code: 'shared_integration_overdelivery',
  package_policy_id: 'pp-shared',
  package_policy_name: 'Shared osquery',
  additional_policy_ids: additional,
  ...overrides,
});

describe('addSharedIntegrationWarningToasts', () => {
  const toasts = { addWarning: jest.fn() };
  let queryClient: QueryClient;

  const run = (warnings: SharedIntegrationWarning[] | undefined, packId?: string) =>
    addSharedIntegrationWarningToasts({
      warnings,
      packId,
      toasts,
      queryClient,
      getUrlForApp: getUrlForApp as never,
      navigateToApp: navigateToApp as never,
      startServices: {} as never,
    });

  const renderToast = (index = 0) =>
    render(<I18nProvider>{toasts.addWarning.mock.calls[index][0].text}</I18nProvider>);

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient();
    queryClient.setQueryData(
      ['agentPolicies'],
      Object.entries(names).map(([id, name]) => ({ id, name }))
    );
  });

  it('caps the names at three and says how many more, with a link to the pack', () => {
    run([warning(Object.keys(names))], 'pack-1');

    expect(toasts.addWarning).toHaveBeenCalledTimes(1);
    expect(toasts.addWarning.mock.calls[0][0].title).toBe('Pack also runs on other agent policies');
    const { container } = renderToast();
    expect(container.textContent).toContain('Policy A, Policy B, Policy C and 2 more');
    expect(container.textContent).not.toContain('Policy D');
    expect(screen.getByTestId('sharedIntegrationWarningToastPackLink')).toHaveAttribute(
      'href',
      '/app/osquery/packs/pack-1/edit'
    );
  });

  it('names both policies without "more" when there are two', () => {
    run([warning(['policy-a', 'policy-b'])], 'pack-1');

    const { container } = renderToast();
    expect(container.textContent).toContain('Policy A and Policy B');
    expect(container.textContent).not.toContain('more');
  });

  it('renders no link without a pack id', () => {
    run([warning(['policy-a'])]);

    const { container } = renderToast();
    expect(container.textContent).toContain('Policy A');
    expect(screen.queryByTestId('sharedIntegrationWarningToastPackLink')).not.toBeInTheDocument();
  });

  it('does not toast without warnings or additional ids', () => {
    run(undefined, 'pack-1');
    run([], 'pack-1');
    run([warning([])], 'pack-1');

    expect(toasts.addWarning).not.toHaveBeenCalled();
  });

  it('falls back to ids for uncached policies and still caps at three', () => {
    queryClient.setQueryData(['agentPolicies'], []);
    run([warning(['id-1', 'id-2', 'id-3', 'id-4', 'id-5'])], 'pack-1');

    const { container } = renderToast();
    expect(container.textContent).toContain('id-1, id-2, id-3 and 2 more');
    expect(container.textContent).not.toContain('id-4');
  });

  it('lists the first three ids with "and 2 more" and no link when names are uncached and the pack id is unknown', () => {
    queryClient.setQueryData(['agentPolicies'], []);
    run([warning(['id-1', 'id-2', 'id-3', 'id-4', 'id-5'])]);

    expect(toasts.addWarning).toHaveBeenCalledTimes(1);
    const { container } = renderToast();
    expect(container.textContent).toContain('id-1, id-2, id-3 and 2 more');
    expect(container.textContent).not.toContain('id-4');
    expect(container.textContent).not.toContain('id-5');
    expect(screen.queryByTestId('sharedIntegrationWarningToastPackLink')).not.toBeInTheDocument();
    expect(getUrlForApp).not.toHaveBeenCalled();
  });

  it('shows every warning in one toast, each naming its own integration', () => {
    run(
      [
        warning(['policy-a', 'policy-b', 'policy-c', 'policy-d'], {
          package_policy_name: 'Integration One',
        }),
        warning(['policy-e'], {
          package_policy_id: 'pp-2',
          package_policy_name: 'Integration Two',
        }),
      ],
      'pack-1'
    );

    // Kibana merges toasts with the same title and mount-function source, so one toast
    // must carry both integrations.
    expect(toasts.addWarning).toHaveBeenCalledTimes(1);
    const text = renderToast(0).container.textContent;
    expect(text).toContain('Integration One');
    expect(text).toContain('Policy A, Policy B, Policy C and 1 more');
    expect(text).toContain('Integration Two');
    expect(text).toContain('Policy E');
  });

  it('navigates in the app when the pack link is clicked', () => {
    run([warning(['policy-a'])], 'pack-1');
    renderToast();

    fireEvent.click(screen.getByTestId('sharedIntegrationWarningToastPackLink'));
    expect(navigateToApp).toHaveBeenCalledWith('osquery', { path: '/packs/pack-1/edit' });
  });
});

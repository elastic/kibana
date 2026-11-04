/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import React from 'react';

import type {
  ServiceAccountBoundWorkload,
  ServiceAccountRoleReference,
} from '@kbn/core-security-common';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import type { ServiceAccountRoleUsageCalloutProps } from './service_account_role_usage_callout';
import {
  hasServiceAccountRoleUsageCallout,
  ServiceAccountRoleUsageCallout,
  ServiceAccountRoleUsageSaveHint,
} from './service_account_role_usage_callout';
import type { ServiceAccountRoleUsage } from './use_service_account_role_usage';

const account = (
  name: string,
  overrides: Partial<ServiceAccountRoleReference> = {}
): ServiceAccountRoleReference => ({
  id: `kibana/${name}`,
  name,
  roles: ['viewer'],
  enabled: true,
  workloadCount: 1,
  ...overrides,
});

const workload: ServiceAccountBoundWorkload = {
  pluginId: 'workflows',
  workloadType: 'workflow',
  workloadId: 'w-1',
  displayName: 'Nightly report',
};

const loaded = (
  serviceAccounts: ServiceAccountRoleReference[],
  complete = true
): ServiceAccountRoleUsage => ({ status: 'loaded', serviceAccounts, complete });

const renderCallout = (props: Partial<ServiceAccountRoleUsageCalloutProps> = {}) => {
  const listWorkloads = jest.fn().mockResolvedValue([workload]);
  renderWithI18n(
    <EuiProvider>
      <ServiceAccountRoleUsageCallout
        usage={loaded([account('relay')])}
        serviceAccounts={{ listWorkloads }}
        roleCount={1}
        action="update"
        {...props}
      />
    </EuiProvider>
  );
  return { listWorkloads };
};

describe('ServiceAccountRoleUsageCallout', () => {
  it('names the accounts that hold the role with their workload counts', () => {
    renderCallout({
      usage: loaded([
        account('relay', { workloadCount: 3 }),
        account('idle', { workloadCount: 0 }),
      ]),
    });

    const callout = screen.getByTestId('serviceAccountRoleUsageCallout');
    expect(callout).toHaveTextContent('2 service accounts use this role');
    expect(callout).toHaveTextContent(
      'Changes take effect immediately for these accounts and for the workloads that run as them.'
    );
    expect(within(callout).getByText('relay')).toBeVisible();
    expect(within(callout).getByText('3 workloads')).toBeVisible();
    expect(within(callout).getByText('0 workloads')).toBeVisible();
  });

  it('uses delete wording when the roles are being deleted', () => {
    renderCallout({ action: 'delete', roleCount: 2 });

    expect(screen.getByTestId('serviceAccountRoleUsageCallout')).toHaveTextContent(
      'Deleting these roles immediately removes the privileges they grant from these accounts'
    );
  });

  it('badges disabled accounts', () => {
    renderCallout({ usage: loaded([account('relay', { enabled: false })]) });

    expect(screen.getByTestId('serviceAccountRoleUsageDisabledBadge')).toHaveTextContent(
      'Disabled'
    );
  });

  it('loads the workloads of an account only when it is first expanded', async () => {
    const { listWorkloads } = renderCallout();

    expect(listWorkloads).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('relay'));

    await waitFor(() => expect(screen.getByText('Nightly report')).toBeInTheDocument());
    expect(listWorkloads).toHaveBeenCalledWith('kibana/relay');
  });

  it('says so when the workloads cannot be loaded', async () => {
    const listWorkloads = jest.fn().mockRejectedValue(new Error('boom'));
    renderCallout({ serviceAccounts: { listWorkloads } });

    fireEvent.click(screen.getByText('relay'));

    await waitFor(() =>
      expect(screen.getByTestId('serviceAccountRoleUsageWorkloadsError')).toBeInTheDocument()
    );
  });

  it('groups the accounts by role when more than one role is involved', () => {
    renderCallout({
      roleCount: 2,
      usage: loaded([
        account('both', { roles: ['editor', 'viewer'] }),
        account('viewer-only', { roles: ['viewer'] }),
      ]),
    });

    const groups = screen.getAllByTestId('serviceAccountRoleUsageGroup');
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveTextContent('editor');
    expect(within(groups[0]).getAllByTestId('serviceAccountRoleUsageAccount')).toHaveLength(1);
    expect(groups[1]).toHaveTextContent('viewer');
    expect(within(groups[1]).getAllByTestId('serviceAccountRoleUsageAccount')).toHaveLength(2);
  });

  it('folds long lists behind a button', () => {
    renderCallout({
      usage: loaded(Array.from({ length: 7 }, (_, index) => account(`account-${index}`))),
    });

    expect(screen.getAllByTestId('serviceAccountRoleUsageAccount')).toHaveLength(5);

    fireEvent.click(screen.getByTestId('serviceAccountRoleUsageShowAll'));

    expect(screen.getAllByTestId('serviceAccountRoleUsageAccount')).toHaveLength(7);
  });

  it('notes an incomplete lookup alongside what it found', () => {
    renderCallout({ usage: loaded([account('relay')], false) });

    expect(screen.getByTestId('serviceAccountRoleUsageCallout')).toBeInTheDocument();
    expect(screen.getByTestId('serviceAccountRoleUsageIncomplete')).toHaveTextContent(
      "Couldn't check every service account, so more may use this role."
    );
  });

  it('shows only the note when an incomplete lookup found nothing', () => {
    renderCallout({ usage: loaded([], false) });

    expect(screen.queryByTestId('serviceAccountRoleUsageCallout')).not.toBeInTheDocument();
    expect(screen.getByTestId('serviceAccountRoleUsageIncomplete')).toBeInTheDocument();
  });

  it('notes a failed lookup', () => {
    renderCallout({ usage: { status: 'error' } });

    expect(screen.getByTestId('serviceAccountRoleUsageError')).toHaveTextContent(
      "Couldn't check which service accounts use this role."
    );
  });

  it('shows a quiet loading line while looking up', () => {
    renderCallout({ usage: { status: 'loading' } });

    expect(screen.getByTestId('serviceAccountRoleUsageLoading')).toBeInTheDocument();
  });

  it.each<[string, ServiceAccountRoleUsage]>([
    ['hidden', { status: 'hidden' }],
    ['a complete lookup that found nothing', loaded([])],
  ])('renders nothing for %s', (_, usage) => {
    renderCallout({ usage });

    expect(hasServiceAccountRoleUsageCallout(usage)).toBe(false);
    expect(screen.queryByTestId('serviceAccountRoleUsageCallout')).not.toBeInTheDocument();
    expect(screen.queryByTestId('serviceAccountRoleUsageIncomplete')).not.toBeInTheDocument();
  });
});

describe('ServiceAccountRoleUsageSaveHint', () => {
  const renderHint = (usage: ServiceAccountRoleUsage) =>
    renderWithI18n(
      <EuiProvider>
        <ServiceAccountRoleUsageSaveHint usage={usage} />
      </EuiProvider>
    );

  it('counts the affected accounts', () => {
    renderHint(loaded([account('a'), account('b')]));

    expect(screen.getByTestId('serviceAccountRoleUsageSaveHint')).toHaveTextContent(
      'Saving affects 2 service accounts'
    );
  });

  it.each<[string, ServiceAccountRoleUsage]>([
    ['no accounts', loaded([])],
    ['a lookup in progress', { status: 'loading' }],
    ['a failed lookup', { status: 'error' }],
  ])('renders nothing for %s', (_, usage) => {
    renderHint(usage);

    expect(screen.queryByTestId('serviceAccountRoleUsageSaveHint')).not.toBeInTheDocument();
  });
});

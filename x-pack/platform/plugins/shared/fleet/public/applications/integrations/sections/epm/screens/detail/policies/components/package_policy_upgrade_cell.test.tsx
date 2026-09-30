/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import type { AgentPolicy, InMemoryPackagePolicy } from '../../../../../../types';
import { ExperimentalFeaturesService } from '../../../../../../services';
import { allowedExperimentalValues } from '../../../../../../../../../common/experimental_features';

import { PackagePolicyUpgradeCell } from './package_policy_upgrade_cell';

// These real hooks import the components index (directly or via the alerting page), which reaches
// `use_agentless_policy_upgrade`, so loading them from the hooks mock factory below would evaluate
// that module against the actual hooks (Jest re-entered the factory instead).
vi.mock('../../../../../../hooks/use_confirm_force_install', () => ({
  useConfirmForceInstall: vi.fn(),
}));
vi.mock('../../../../../../hooks/use_alerting_assets', () => ({ useAlertingAssets: vi.fn() }));

vi.mock('../../../../../../hooks', async () => {
  const mocked = {
    ...(await vi.importActual('../../../../../../hooks')),
    useLink: vi.fn().mockReturnValue({ getHref: vi.fn().mockReturnValue('/mock/upgrade') }),
    useAuthz: vi.fn().mockReturnValue({ integrations: { writeIntegrationPolicies: true } }),
    useStartServices: vi.fn().mockReturnValue({
      notifications: {
        toasts: { addSuccess: vi.fn(), addWarning: vi.fn(), addError: vi.fn() },
      },
    }),
    // Stubbed so opening the confirm modal never risks a real request; the actual upgrade call +
    // refresh are covered end-to-end by the shared hook via `package_policy_actions_menu.test.tsx`.
    sendBulkUpgradeAgentlessPolicies: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const agentPolicies = [
  { id: 'agentless-1', name: 'Agentless', supports_agentless: true },
] as AgentPolicy[];

const createPackagePolicy = (props: Partial<InMemoryPackagePolicy> = {}): InMemoryPackagePolicy =>
  ({
    id: 'pp-1',
    name: 'my-agentless-policy',
    hasUpgrade: true,
    upgradeVersion: '0.5.0',
    package: { name: 'nginx', title: 'Nginx', version: '0.4.0' },
    ...props,
  } as InMemoryPackagePolicy);

function renderCell(props: Partial<React.ComponentProps<typeof PackagePolicyUpgradeCell>> = {}) {
  return render(
    <IntlProvider>
      <PackagePolicyUpgradeCell
        agentPolicies={agentPolicies}
        packagePolicy={createPackagePolicy()}
        {...props}
      />
    </IntlProvider>
  );
}

describe('PackagePolicyUpgradeCell', () => {
  beforeEach(() => {
    ExperimentalFeaturesService.init(allowedExperimentalValues);
  });

  afterEach(() => {
    if (vi.isMockFunction(ExperimentalFeaturesService.get)) {
      vi.mocked(ExperimentalFeaturesService.get).mockRestore();
    }
  });

  it('links to the legacy upgrade route for a non-agentless policy', async () => {
    const utils = renderCell({ packagePolicy: createPackagePolicy({ supports_agentless: false }) });
    const button = await utils.findByTestId('integrationPolicyUpgradeBtn');
    expect(button).toHaveAttribute('href');
  });

  it('links to the legacy upgrade route for an agentless policy while disableAgentlessLegacyAPI is off', async () => {
    vi.spyOn(ExperimentalFeaturesService, 'get').mockReturnValue({
      ...allowedExperimentalValues,
      disableAgentlessLegacyAPI: false,
    });
    const utils = renderCell({ packagePolicy: createPackagePolicy({ supports_agentless: true }) });
    const button = await utils.findByTestId('integrationPolicyUpgradeBtn');
    // Flag off (default): the legacy edit-page upgrade still works, so the link is untouched.
    expect(button).toHaveAttribute('href');
  });

  describe('with disableAgentlessLegacyAPI enabled', () => {
    beforeEach(() => {
      // disableAgentlessLegacyAPI is on by default via allowedExperimentalValues.
      vi.spyOn(ExperimentalFeaturesService, 'get').mockReturnValue({
        ...allowedExperimentalValues,
      });
    });

    it('opens the agentless upgrade confirm modal instead of linking to the legacy route', async () => {
      const utils = renderCell({
        packagePolicy: createPackagePolicy({ supports_agentless: true }),
      });

      const button = await utils.findByTestId('integrationPolicyUpgradeBtn');
      // The agentless upgrade opens a confirm modal instead of linking to the (blocked) legacy route.
      expect(button).not.toHaveAttribute('href');

      await act(async () => {
        fireEvent.click(button);
      });

      // The shared agentless-upgrade confirm modal is shown.
      expect(await utils.findByTestId('confirmModalConfirmButton')).toBeInTheDocument();
    });
  });
});

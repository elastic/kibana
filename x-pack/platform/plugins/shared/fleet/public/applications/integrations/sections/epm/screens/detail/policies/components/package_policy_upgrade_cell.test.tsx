/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { act, fireEvent } from '@testing-library/react';

import type { AgentPolicy, InMemoryPackagePolicy } from '../../../../../../types';
import { ExperimentalFeaturesService } from '../../../../../../services';
import { createIntegrationsTestRendererMock } from '../../../../../../../../mock';
import { allowedExperimentalValues } from '../../../../../../../../../common/experimental_features';

import { PackagePolicyUpgradeCell } from './package_policy_upgrade_cell';

jest.mock('../../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../../hooks'),
  // `useConfirmForceInstall` is undefined from `requireActual` on this barrel (circular deps);
  // the renderer's provider tree calls it, so stub it like the sibling table tests do.
  useConfirmForceInstall: jest.fn(),
  // Stubbed so opening the confirm modal never risks a real request; the actual upgrade call +
  // refresh are covered end-to-end by the shared hook via `package_policy_actions_menu.test.tsx`.
  sendBulkUpgradeAgentlessPolicies: jest.fn(),
}));

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
  const renderer = createIntegrationsTestRendererMock();
  return renderer.render(
    <PackagePolicyUpgradeCell
      agentPolicies={agentPolicies}
      packagePolicy={createPackagePolicy()}
      {...props}
    />
  );
}

describe('PackagePolicyUpgradeCell', () => {
  afterEach(() => {
    if (jest.isMockFunction(ExperimentalFeaturesService.get)) {
      jest.mocked(ExperimentalFeaturesService.get).mockRestore();
    }
  });

  it('links to the legacy upgrade route for a non-agentless policy', async () => {
    const utils = renderCell({ packagePolicy: createPackagePolicy({ supports_agentless: false }) });
    const button = await utils.findByTestId('integrationPolicyUpgradeBtn');
    expect(button).toHaveAttribute('href');
  });

  it('links to the legacy upgrade route for an agentless policy while disableAgentlessLegacyAPI is off', async () => {
    const utils = renderCell({ packagePolicy: createPackagePolicy({ supports_agentless: true }) });
    const button = await utils.findByTestId('integrationPolicyUpgradeBtn');
    // Flag off (default): the legacy edit-page upgrade still works, so the link is untouched.
    expect(button).toHaveAttribute('href');
  });

  describe('with disableAgentlessLegacyAPI enabled', () => {
    beforeEach(() => {
      jest.spyOn(ExperimentalFeaturesService, 'get').mockReturnValue({
        ...allowedExperimentalValues,
        disableAgentlessLegacyAPI: true,
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

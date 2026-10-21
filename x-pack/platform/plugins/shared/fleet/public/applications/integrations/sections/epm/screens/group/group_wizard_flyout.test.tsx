/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: browse tile -> onboarding wizard flyout (embedded host).

import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react';

import { createIntegrationsTestRendererMock } from '../../../../../../mock';
import type { PackageInfo } from '../../../../../../types';
import { sendGetPackageInfoByKeyForRq } from '../../../../../../hooks';
import type { IntegrationCardItem } from '../home/card_utils';

import { nginxOtelPackageInfo, nginxPackageInfo } from './group_wizard/__fixtures__/nginx';
import { nginxGroupItem } from './group_wizard/__fixtures__/groups';
import { GROUP_TILE_OPENS_FLYOUT, useGroupWizardFlyout } from './group_wizard_flyout';

jest.mock('../../../../../../services/use_yaml', () => ({ useYaml: () => require('yaml') }));
jest.mock(
  '../../../../../fleet/sections/agent_policy/create_package_policy_page/components/steps/components/use_policies',
  () => ({ useAllNonManagedAgentPolicies: jest.fn().mockReturnValue([]) })
);
jest.mock('../../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../../hooks'),
  sendGetPackageInfoByKeyForRq: jest.fn(),
  sendGetPackagePolicies: jest.fn().mockResolvedValue({ data: { items: [] } }),
}));
jest.mock('../../../../../../hooks/use_group_package', () => {
  const listItem = (info: { name: string; title: string; version: string }) => ({
    ...info,
    id: info.name,
    release: 'beta',
  });
  const { nginxGroupItem: group } = jest.requireActual('./group_wizard/__fixtures__/groups');
  const nginx = jest.requireActual('./group_wizard/__fixtures__/nginx');
  return {
    useGroupPackage: () => ({
      isLoading: false,
      group,
      defaultSchema: 'otel',
      options: [
        {
          schema: 'otel',
          packageName: 'nginx_otel_integration',
          versionConstraint: '^0.1.0',
          child: listItem(nginx.nginxOtelPackageInfo),
          isInstalled: false,
        },
        {
          schema: 'ecs',
          packageName: 'nginx',
          versionConstraint: '^3.0.0',
          child: listItem(nginx.nginxPackageInfo),
          isInstalled: false,
        },
      ],
    }),
  };
});

const PACKAGES: Record<string, PackageInfo> = {
  nginx: nginxPackageInfo,
  nginx_otel_integration: nginxOtelPackageInfo,
};

const Browse: React.FC<{ cards: IntegrationCardItem[] }> = ({ cards }) => {
  const { withGroupFlyout, flyout } = useGroupWizardFlyout();
  return (
    <>
      {withGroupFlyout(cards).map((card) => (
        <button key={card.id} data-test-subj={`card-${card.name}`} onClick={card.onCardClick}>
          {card.title}
        </button>
      ))}
      {flyout}
    </>
  );
};

describe('group tile -> wizard flyout', () => {
  beforeEach(() => {
    (sendGetPackageInfoByKeyForRq as jest.Mock).mockImplementation((name: string) =>
      Promise.resolve({ item: PACKAGES[name] })
    );
  });

  it('opens the wizard embedded in a flyout, other tiles untouched', async () => {
    expect(GROUP_TILE_OPENS_FLYOUT).toBe(true);
    const cards = [
      { id: 'epr:nginx_group', name: 'nginx_group', title: 'Nginx', isIntegrationGroupCard: true },
      { id: 'epr:redis', name: 'redis', title: 'Redis' },
    ] as IntegrationCardItem[];
    const renderer = createIntegrationsTestRendererMock();
    const result = renderer.render(<Browse cards={cards} />);
    expect(result.queryByTestId('groupWizardFlyout')).not.toBeInTheDocument();

    act(() => {
      fireEvent.click(result.getByTestId('card-nginx_group'));
    });
    await waitFor(() => expect(result.getByTestId('groupWizardFlyout')).toBeInTheDocument());
    expect(result.getByTestId('groupWizardFlyout')).toHaveTextContent(nginxGroupItem.title);
    await waitFor(() => expect(result.getByTestId('groupWizardSignal-logs')).toBeInTheDocument());
    // Embedded: the host owns the header, the wizard doesn't render its page header
    expect(result.queryByTestId('groupWizardBack')).not.toBeInTheDocument();

    act(() => {
      fireEvent.click(result.getByTestId('groupWizardNext'));
    });
    await waitFor(() =>
      expect(result.getByTestId('groupWizardStreamCard-nginx.access')).toBeInTheDocument()
    );
    expect(renderer.mountHistory.location.search).toBe('');
  });
});

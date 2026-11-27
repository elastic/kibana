/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createFleetTestRendererMock } from '../../../../../../mock';
import type { UpgradePackagePolicyDryRunResponse } from '../../../../types';

import { UpgradeStatusCallout } from './upgrade';

const dryRunData = (hasErrors: boolean) =>
  [
    {
      name: 'aws_mq-1',
      hasErrors,
      diff: [
        { id: 'pp-1', name: 'aws_mq-1', package: { name: 'aws_mq', version: '2.0.1' } },
        { name: 'aws_mq-1', package: { name: 'aws_mq', version: '2.3.0' } },
      ],
    },
  ] as unknown as UpgradePackagePolicyDryRunResponse;

describe('UpgradeStatusCallout', () => {
  const render = (props: Partial<React.ComponentProps<typeof UpgradeStatusCallout>>) =>
    createFleetTestRendererMock().render(
      <UpgradeStatusCallout dryRunData={dryRunData(false)} newSecrets={[]} {...props} />
    );

  it('shows that the upgrade is ready', () => {
    const { queryByText } = render({});

    expect(queryByText('Ready to upgrade')).not.toBeNull();
  });

  it('does not show that the upgrade is ready when agents would stop collecting data', () => {
    const { queryByText } = render({ hasAgentVersionIncompatibility: true });

    expect(queryByText('Ready to upgrade')).toBeNull();
  });

  it('still shows conflicts when agents would stop collecting data', () => {
    const { queryByText } = render({
      dryRunData: dryRunData(true),
      hasAgentVersionIncompatibility: true,
    });

    expect(queryByText('Review field conflicts')).not.toBeNull();
  });
});

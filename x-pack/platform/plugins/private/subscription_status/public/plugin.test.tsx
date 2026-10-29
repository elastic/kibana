/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, of } from 'rxjs';
import { waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { SubscriptionStatusPlugin } from './plugin';

const startPlugin = (flag$?: BehaviorSubject<boolean>) => {
  const plugin = new SubscriptionStatusPlugin();
  plugin.setup(coreMock.createSetup(), { cloud: cloudMock.createSetup() });

  const core = coreMock.createStart();
  if (flag$) {
    core.featureFlags.getBooleanValue$.mockImplementation((flagName, fallback) =>
      flagName === 'subscriptionStatus.enabled' ? flag$ : of(fallback)
    );
  }
  const cloud = {
    ...cloudMock.createStart(),
    isServerlessEnabled: true,
    serverless: {
      projectId: 'project-id',
      projectType: 'search' as const,
      organizationInTrial: true,
    },
  };

  plugin.start(core, { cloud });
  return core;
};

describe('SubscriptionStatusPlugin', () => {
  it('shows the badge for a Serverless trial by default', async () => {
    const core = startPlugin();

    await waitFor(() =>
      expect(core.chrome.controls.subscriptionBadge.set).toHaveBeenCalledWith(expect.anything())
    );
    expect(core.analytics.reportEvent).toHaveBeenCalledWith('subscription_status_badge_shown', {
      hasBillingAccess: false,
      projectType: 'search',
    });
  });

  it('does not show the badge for a Serverless trial when the feature flag is off', async () => {
    const core = startPlugin(new BehaviorSubject(false));

    // Give a wrongly started badge time to resolve before asserting it never rendered.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(core.chrome.controls.subscriptionBadge.set).not.toHaveBeenCalledWith(expect.anything());
    expect(core.analytics.reportEvent).not.toHaveBeenCalled();
  });

  it('removes the badge when the feature flag turns off', async () => {
    const flag$ = new BehaviorSubject(true);
    const core = startPlugin(flag$);
    const { set } = core.chrome.controls.subscriptionBadge;
    await waitFor(() => expect(set).toHaveBeenCalledWith(expect.anything()));

    flag$.next(false);

    expect(set).toHaveBeenLastCalledWith(undefined);
  });
});

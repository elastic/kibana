/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import { resolveServerlessStatus } from './status/resolve_serverless';
import type { BadgeActionClickedEvent, BadgeOpenedEvent, BadgeShownEvent } from './telemetry';
import {
  BADGE_ACTION_CLICKED_EVENT,
  BADGE_OPENED_EVENT,
  BADGE_SHOWN_EVENT,
  registerSubscriptionStatusEvents,
} from './telemetry';

interface SubscriptionStatusSetupDeps {
  cloud?: CloudSetup;
}

interface SubscriptionStatusStartDeps {
  cloud?: CloudStart;
}

export class SubscriptionStatusPlugin
  implements Plugin<void, void, SubscriptionStatusSetupDeps, SubscriptionStatusStartDeps>
{
  private csp?: string;
  private region?: string;

  public setup(core: CoreSetup, { cloud }: SubscriptionStatusSetupDeps) {
    registerSubscriptionStatusEvents(core.analytics);
    this.csp = cloud?.csp;
    this.region = cloud?.region;
  }

  public start(core: CoreStart, { cloud }: SubscriptionStatusStartDeps) {
    if (!cloud) return;
    void this.showBadge(core, cloud);
  }

  public stop() {}

  private async showBadge({ analytics, chrome }: CoreStart, cloud: CloudStart) {
    const status = await resolveServerlessStatus({ cloud, csp: this.csp, region: this.region });
    if (!status) return;

    const { SubscriptionBadge } = await import('./components/subscription_badge');
    const { projectType } = status;

    chrome.controls.subscriptionBadge.set(
      <SubscriptionBadge
        status={status}
        onOpen={() => analytics.reportEvent<BadgeOpenedEvent>(BADGE_OPENED_EVENT, { projectType })}
        onAction={(action) =>
          analytics.reportEvent<BadgeActionClickedEvent>(BADGE_ACTION_CLICKED_EVENT, {
            action,
            projectType,
          })
        }
      />
    );
    analytics.reportEvent<BadgeShownEvent>(BADGE_SHOWN_EVENT, {
      hasBillingAccess: status.kind === 'popover',
      projectType,
    });
  }
}

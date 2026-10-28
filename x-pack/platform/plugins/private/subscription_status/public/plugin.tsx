/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Observable } from 'rxjs';
import { defer, distinctUntilChanged, map, of, switchMap, type Subscription } from 'rxjs';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { resolveServerlessStatus } from './status/resolve_serverless';
import { resolveSelfManagedStatus } from './status/resolve_self_managed';
import type { SubscriptionStatus } from './status/types';
import type { BadgeActionClickedEvent, BadgeOpenedEvent, BadgeShownEvent } from './telemetry';
import {
  BADGE_ACTION_CLICKED_EVENT,
  BADGE_OPENED_EVENT,
  BADGE_SHOWN_EVENT,
  registerSubscriptionStatusEvents,
} from './telemetry';

const ENABLED_FLAG = 'subscriptionStatus.enabled';

interface SubscriptionStatusSetupDeps {
  cloud?: CloudSetup;
}

interface SubscriptionStatusStartDeps {
  cloud?: CloudStart;
  licensing?: LicensingPluginStart;
}

interface ResolvedBadge {
  status: SubscriptionStatus;
  hasBillingAccess: boolean;
}

export class SubscriptionStatusPlugin
  implements Plugin<void, void, SubscriptionStatusSetupDeps, SubscriptionStatusStartDeps>
{
  private csp?: string;
  private region?: string;
  private badgeSubscription?: Subscription;

  public setup(core: CoreSetup, { cloud }: SubscriptionStatusSetupDeps) {
    registerSubscriptionStatusEvents(core.analytics);
    this.csp = cloud?.csp;
    this.region = cloud?.region;
  }

  public start(core: CoreStart, { cloud, licensing }: SubscriptionStatusStartDeps) {
    const badge$ = this.getBadge$(core, cloud, licensing);
    if (!badge$) return;

    this.badgeSubscription = core.featureFlags
      .getBooleanValue$(ENABLED_FLAG, true)
      .pipe(
        distinctUntilChanged(),
        switchMap((enabled) => (enabled ? badge$ : of(undefined))),
        switchMap((badge) =>
          badge
            ? import('./components/subscription_badge').then(({ SubscriptionBadge }) => ({
                ...badge,
                SubscriptionBadge,
              }))
            : of(undefined)
        )
      )
      .subscribe((badge) => {
        if (!badge) {
          core.chrome.controls.subscriptionBadge.set(undefined);
          return;
        }
        const { status, hasBillingAccess, SubscriptionBadge } = badge;
        const { analytics, application, chrome } = core;
        const context = {
          projectType: status.projectType,
          licenseType: status.kind === 'popover' ? status.licenseType : undefined,
        };

        chrome.controls.subscriptionBadge.set(
          <SubscriptionBadge
            status={status}
            onOpen={() => analytics.reportEvent<BadgeOpenedEvent>(BADGE_OPENED_EVENT, context)}
            onAction={(action) =>
              analytics.reportEvent<BadgeActionClickedEvent>(BADGE_ACTION_CLICKED_EVENT, {
                action,
                ...context,
              })
            }
            onNavigate={(href) => application.navigateToUrl(href)}
          />
        );
        analytics.reportEvent<BadgeShownEvent>(BADGE_SHOWN_EVENT, { hasBillingAccess, ...context });
      });
  }

  public stop() {
    this.badgeSubscription?.unsubscribe();
  }

  private getBadge$(
    { application, docLinks }: CoreStart,
    cloud?: CloudStart,
    licensing?: LicensingPluginStart
  ): Observable<ResolvedBadge | undefined> | undefined {
    // Cloud Hosted and ECE are cloud-enabled; ECK reports as self-managed.
    if (cloud?.isCloudEnabled) {
      return defer(() =>
        resolveServerlessStatus({ cloud, csp: this.csp, region: this.region })
      ).pipe(map((status) => status && { status, hasBillingAccess: status.kind === 'popover' }));
    }
    if (!licensing) return undefined;

    const canManageLicense = Boolean(
      application.capabilities.management?.stack?.license_management
    );
    const urls = {
      compareFeatures: docLinks.links.subscriptions,
      manageLicense: application.getUrlForApp('management', { path: 'stack/license_management' }),
    };

    return licensing.license$.pipe(
      map((license) => {
        const status = resolveSelfManagedStatus({ license, canManageLicense, urls });
        return status && { status, hasBillingAccess: canManageLicense };
      })
    );
  }
}

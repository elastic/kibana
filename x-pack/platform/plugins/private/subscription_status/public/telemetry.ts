/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, RootSchema } from '@kbn/core/public';
import type { SubscriptionStatusActionId } from './status/types';

export const BADGE_SHOWN_EVENT = 'subscription_status_badge_shown';
export const BADGE_OPENED_EVENT = 'subscription_status_badge_opened';
export const BADGE_ACTION_CLICKED_EVENT = 'subscription_status_badge_action_clicked';

interface BadgeContextFields {
  projectType?: string;
  licenseType?: string;
}

export interface BadgeShownEvent extends BadgeContextFields {
  hasBillingAccess: boolean;
}

export type BadgeOpenedEvent = BadgeContextFields;

export interface BadgeActionClickedEvent extends BadgeContextFields {
  action: SubscriptionStatusActionId;
}

const contextSchema: RootSchema<BadgeContextFields> = {
  projectType: {
    type: 'keyword',
    _meta: { description: 'The Serverless project type.', optional: true },
  },
  licenseType: {
    type: 'keyword',
    _meta: { description: 'The self-managed license type: trial or basic.', optional: true },
  },
};

export const registerSubscriptionStatusEvents = (analytics: AnalyticsServiceSetup) => {
  analytics.registerEventType<BadgeShownEvent>({
    eventType: BADGE_SHOWN_EVENT,
    schema: {
      hasBillingAccess: {
        type: 'boolean',
        _meta: {
          description:
            'Whether the user can manage the subscription: Cloud billing access on Serverless, License Management access on self-managed.',
        },
      },
      ...contextSchema,
    },
  });
  analytics.registerEventType<BadgeOpenedEvent>({
    eventType: BADGE_OPENED_EVENT,
    schema: contextSchema,
  });
  analytics.registerEventType<BadgeActionClickedEvent>({
    eventType: BADGE_ACTION_CLICKED_EVENT,
    schema: {
      action: {
        type: 'keyword',
        _meta: {
          description:
            'The clicked action: subscribe, view_pricing, compare_features, start_cloud_trial, or manage_license.',
        },
      },
      ...contextSchema,
    },
  });
};

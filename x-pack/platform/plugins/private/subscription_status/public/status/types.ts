/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type SubscriptionStatusActionId =
  | 'subscribe'
  | 'view_pricing'
  | 'compare_features'
  | 'start_cloud_trial'
  | 'manage_license';

export interface SubscriptionStatusAction {
  id: SubscriptionStatusActionId;
  label: string;
  href: string;
  /** External actions open in a new tab. */
  external: boolean;
}

export interface SubscriptionStatusMeter {
  label: string;
  value: string;
  detail: string;
  percent: number;
  urgent: boolean;
}

export type SubscriptionBadgeColor = 'primary' | 'hollow' | 'warning';

export type SubscriptionStatus =
  | {
      kind: 'popover';
      label: string;
      badgeColor?: SubscriptionBadgeColor;
      title?: string;
      subtitle?: string;
      meter?: SubscriptionStatusMeter;
      description?: string;
      primaryAction: SubscriptionStatusAction;
      /** Tinted for users who can't change the subscription, filled (the default) otherwise. */
      primaryActionStyle?: 'fill' | 'tinted';
      secondaryAction?: SubscriptionStatusAction;
      projectType?: string;
      licenseType?: string;
    }
  | {
      kind: 'tooltip';
      label: string;
      tooltip: string;
      projectType?: string;
    };

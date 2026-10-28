/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type SubscriptionStatusActionId = 'subscribe' | 'view_pricing';

export interface SubscriptionStatusAction {
  id: SubscriptionStatusActionId;
  label: string;
  href: string;
}

export type SubscriptionStatus =
  | {
      kind: 'popover';
      label: string;
      title: string;
      subtitle?: string;
      description: string;
      primaryAction: SubscriptionStatusAction;
      secondaryAction?: SubscriptionStatusAction;
      projectType?: string;
    }
  | {
      kind: 'tooltip';
      label: string;
      tooltip: string;
      projectType?: string;
    };

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ThrottleFrequency {
  type: 'throttle';
  interval: string; // e.g. '1h', '30m', '5m'
}

export interface ImmediateFrequency {
  type: 'immediate';
}

export type NotificationPolicyFrequency = ThrottleFrequency | ImmediateFrequency;

export interface NotificationPolicyDestination {
  type: 'workflow';
  id: string;
}

export interface NotificationPolicyFormState {
  name: string;
  description: string;
  matcher: string;
  groupBy: string[];
  frequency: NotificationPolicyFrequency;
  destinations: NotificationPolicyDestination[];
}

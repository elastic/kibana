/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { NotificationPolicyFormState } from '../components/notification_policy/form/types';

export interface NotificationPolicyFormApi {
  setFormValues: (values: Partial<NotificationPolicyFormState>) => void;
}

export const notificationPolicyFormClientApi$ = new BehaviorSubject<
  NotificationPolicyFormApi | undefined
>(undefined);

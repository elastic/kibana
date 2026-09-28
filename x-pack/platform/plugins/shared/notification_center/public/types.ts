/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { NotificationCenterVisibility } from './lib/ui_visibility';

export type NotificationCenterPublicSetup = Record<string, never>;

export interface NotificationCenterPublicStart {
  /**
   * What the UI may render in the active space, as resolved from the
   * `notificationCenter.uiEnabled` deployment flag and the space's advanced settings.
   */
  visibility$: Observable<NotificationCenterVisibility>;
}

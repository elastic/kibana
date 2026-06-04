/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { NotificationsCenterPublicSetup, NotificationsCenterPublicStart } from './types';

export class NotificationsCenterPlugin
  implements Plugin<NotificationsCenterPublicSetup, NotificationsCenterPublicStart>
{
  public setup(_core: CoreSetup): NotificationsCenterPublicSetup {
    // Intentionally registers no application. The user-visible UI is gated on
    // the `notificationsCenter.uiEnabled` feature flag and is introduced in a
    // later issue, so this shell stays dark.
    return {};
  }

  public start(_core: CoreStart): NotificationsCenterPublicStart {
    return {};
  }

  public stop() {}
}

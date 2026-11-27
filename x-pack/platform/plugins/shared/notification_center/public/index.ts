/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaContainerModule, Setup, Start } from '@kbn/core-di';
import type { NotificationCenterPublicSetup, NotificationCenterPublicStart } from './types';

export type { NotificationCenterPublicSetup, NotificationCenterPublicStart } from './types';

const pluginModule = new KibanaContainerModule(({ bind }) => {
  bind(Setup).toConstantValue({} satisfies NotificationCenterPublicSetup);
  bind(Start).toConstantValue({} satisfies NotificationCenterPublicStart);
});

export { pluginModule as module };

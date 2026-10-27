/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { OnSetup } from '@kbn/core-di';
import { CoreSetup, CoreStart, Request } from '@kbn/core-di-server';
import { NotificationCleanupService } from '../cleanup_task/cleanup_expired_notifications';
import { NotificationQueryService } from '../lib/query_notifications';
import { NotificationSubmitService } from '../lib/submit';
import { UnreadStatusService } from '../lib/query_unread_status';
import { ReadStateService } from '../lib/read_state';
import { registerNotificationUserStorage } from '../storage/user_storage';
import { ScopedUserStorage } from '../tokens';

export const bindServices = ({ bind }: ContainerModuleLoadOptions): void => {
  // `Request` only resolves inside a request scope, so read state is request-scoped with it.
  bind(ScopedUserStorage)
    .toResolvedValue((userStorage, request) => userStorage.asScoped(request), [
      CoreStart('userStorage'),
      Request,
    ])
    .inRequestScope();
  bind(ReadStateService).toSelf().inRequestScope();

  bind(NotificationQueryService).toSelf().inSingletonScope();
  bind(UnreadStatusService).toSelf().inSingletonScope();
  bind(NotificationSubmitService).toSelf().inSingletonScope();
  bind(NotificationCleanupService).toSelf().inSingletonScope();

  bind(OnSetup)
    .toResolvedValue(
      (userStorage) => () => registerNotificationUserStorage(userStorage),
      [CoreSetup('userStorage')]
    )
    .inSingletonScope();
};

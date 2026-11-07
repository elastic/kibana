/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { Route } from '@kbn/core-di-server';
import { GetNotificationsRoute } from '../routes/get_notifications';
import { GetUnreadStatusRoute } from '../routes/get_unread_status';
import { MarkAllReadRoute } from '../routes/mark_all_read';
import { MarkReadRoute } from '../routes/mark_read';

export const bindRoutes = ({ bind }: ContainerModuleLoadOptions): void => {
  bind(Route).toConstantValue(GetNotificationsRoute);
  bind(Route).toConstantValue(GetUnreadStatusRoute);
  bind(Route).toConstantValue(MarkReadRoute);
  bind(Route).toConstantValue(MarkAllReadRoute);
};

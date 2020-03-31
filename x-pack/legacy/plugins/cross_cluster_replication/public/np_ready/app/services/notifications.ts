/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { NotificationsSetup, IToasts, FatalErrorsSetup } from 'src/core/public';

let _notifications: IToasts;
let _fatalErrors: FatalErrorsSetup;

export const setNotifications = (
  notifications: NotificationsSetup,
  fatalErrorsSetup: FatalErrorsSetup
) => {
  _notifications = notifications.toasts;
  _fatalErrors = fatalErrorsSetup;
};

export const getNotifications = () => _notifications;
export const getFatalErrors = () => _fatalErrors;

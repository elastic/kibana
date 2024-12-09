/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NotificationsStart } from '@kbn/core/public';

export class NotificationService {
  private _toasts: any;

  public setup(notifications: NotificationsStart): void {
    this._toasts = notifications.toasts;
  }

  public get toasts() {
    return this._toasts;
  }

  private addToasts = (title: string, type: 'danger' | 'warning' | 'success', text?: string) => {
    this._toasts.add({
      title,
      color: type,
      text,
    });
  };

  public showDangerToast(title: string, text?: string) {
    this.addToasts(title, 'danger', text);
  }

  public showWarningToast(title: string, text?: string) {
    this.addToasts(title, 'warning', text);
  }

  public showSuccessToast(title: string, text?: string) {
    this.addToasts(title, 'success', text);
  }
}

export const notificationService = new NotificationService();

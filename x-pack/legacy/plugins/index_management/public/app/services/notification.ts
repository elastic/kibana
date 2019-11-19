/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NotificationsStart } from '../../../../../../../src/core/public';

class NotificationService {
  private toasts: any;

  public init(notifications: NotificationsStart): void {
    this.toasts = notifications.toasts;
  }

  private addToasts = (title: string, type: 'danger' | 'warning' | 'success', text?: string) => {
    this.toasts.add({
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

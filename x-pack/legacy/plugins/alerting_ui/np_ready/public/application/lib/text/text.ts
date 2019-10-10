/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

class TextService {
  public breadcrumbs: { [key: string]: string } = {};
  public i18n: any;

  public init(i18n: any): void {
    this.i18n = i18n;

    this.breadcrumbs = {
      home: i18n.translate('xpack.alertingUI.home.breadcrumbTitle', {
        defaultMessage: 'Alerting UI',
      }),
      alerts: i18n.translate('xpack.alertingUI.alerts.breadcrumbTitle', {
        defaultMessage: 'Alerts',
      }),
      actions: i18n.translate('xpack.alertingUI.actions.breadcrumbTitle', {
        defaultMessage: 'Actions',
      }),
      notifications: i18n.translate('xpack.alertingUI.notifications.breadcrumbTitle', {
        defaultMessage: 'Notifications',
      }),
      activity_logs: i18n.translate('xpack.alertingUI.activity_logs.breadcrumbTitle', {
        defaultMessage: 'Activity logs',
      }),
    };
  }
}

export const textService = new TextService();

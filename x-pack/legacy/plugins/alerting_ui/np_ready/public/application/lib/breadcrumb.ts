/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { textService } from './text';
import {
  linkToHome,
  linkToAlerts,
  linkToActions,
  linkToNotifications,
  linkToActivityLogs,
} from '../constants';

class BreadcrumbService {
  private chrome: any;
  private breadcrumbs: {
    [key: string]: Array<{
      text: string;
      href?: string;
    }>;
  } = {
    management: [],
    home: [],
    alerts: [],
    actions: [],
    notifications: [],
    activity_logs: [],
  };

  public init(chrome: any, managementBreadcrumb: any): void {
    this.chrome = chrome;
    this.breadcrumbs.management = [managementBreadcrumb];

    // Home and sections
    this.breadcrumbs.home = [
      ...this.breadcrumbs.management,
      {
        text: textService.breadcrumbs.home,
        href: linkToHome(),
      },
    ];
    this.breadcrumbs.alerts = [
      ...this.breadcrumbs.alerts,
      {
        text: textService.breadcrumbs.alerts,
        href: linkToAlerts(),
      },
    ];
    this.breadcrumbs.actions = [
      ...this.breadcrumbs.actions,
      {
        text: textService.breadcrumbs.actions,
        href: linkToActions(),
      },
    ];
    this.breadcrumbs.activity_logs = [
      ...this.breadcrumbs.home,
      {
        text: textService.breadcrumbs.activity_logs,
        href: linkToActivityLogs(),
      },
    ];
    this.breadcrumbs.notifications = [
      ...this.breadcrumbs.home,
      {
        text: textService.breadcrumbs.notifications,
        href: linkToNotifications(),
      },
    ];
  }

  public setBreadcrumbs(type: string): void {
    const newBreadcrumbs = this.breadcrumbs[type]
      ? [...this.breadcrumbs[type]]
      : [...this.breadcrumbs.home];

    // Pop off last breadcrumb
    const lastBreadcrumb = newBreadcrumbs.pop() as {
      text: string;
      href?: string;
    };

    // Put last breadcrumb back without href
    newBreadcrumbs.push({
      ...lastBreadcrumb,
      href: undefined,
    });

    this.chrome.setBreadcrumbs(newBreadcrumbs);
  }
}

export const breadcrumbService = new BreadcrumbService();

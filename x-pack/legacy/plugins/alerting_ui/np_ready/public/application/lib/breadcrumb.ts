/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { routeToHome, routeToConnectors, routeToAlerts } from '../constants';

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
    actions: [],
  };

  public init(chrome: any, managementBreadcrumb: any): void {
    this.chrome = chrome;
    this.breadcrumbs.management = [managementBreadcrumb];

    // Home and sections
    this.breadcrumbs.home = [
      ...this.breadcrumbs.management,
      {
        text: i18n.translate('xpack.alertingUI.home.breadcrumbTitle', {
          defaultMessage: 'Alerting',
        }),
        href: `#${routeToHome}`,
      },
    ];
    this.breadcrumbs.connectors = [
      ...this.breadcrumbs.home,
      {
        text: i18n.translate('xpack.alertingUI.connectors.breadcrumbTitle', {
          defaultMessage: 'Connectors',
        }),
        href: `#${routeToConnectors}`,
      },
    ];
    this.breadcrumbs.alerts = [
      ...this.breadcrumbs.home,
      {
        text: i18n.translate('xpack.alertingUI.alerts.breadcrumbTitle', {
          defaultMessage: 'Alerts',
        }),
        href: `#${routeToAlerts}`,
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

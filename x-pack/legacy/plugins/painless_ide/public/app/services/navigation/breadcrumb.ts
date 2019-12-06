/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { linkToHome } from '.';

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
  };

  public init(chrome: any, i18n: any, managementBreadcrumb: any): void {
    this.chrome = chrome;
    this.breadcrumbs.management = [managementBreadcrumb];

    this.breadcrumbs.home = [
      ...this.breadcrumbs.management,
      {
        text: i18n.translate('xpack.painlessIde.home.breadcrumbTitle', {
          defaultMessage: 'Painless IDE',
        }),
        href: linkToHome(),
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

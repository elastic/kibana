/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { textService } from '../text';
import { linkToHome } from './links';

export enum BREADCRUMB_SECTION {
  MANAGEMENT = 'management',
  HOME = 'home',
  CREATE_TRANSFORM = 'createTransform',
}

interface BreadcrumbItem {
  text: string;
  href?: string;
}

type Breadcrumbs = {
  [key in BREADCRUMB_SECTION]: BreadcrumbItem[];
};

class BreadcrumbService {
  private chrome: any;
  private breadcrumbs: Breadcrumbs = {
    management: [],
    home: [],
    createTransform: [],
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
    this.breadcrumbs.createTransform = [
      ...this.breadcrumbs.home,
      {
        text: textService.breadcrumbs.createTransform,
      },
    ];
  }

  public setBreadcrumbs(type: BREADCRUMB_SECTION): void {
    const newBreadcrumbs = this.breadcrumbs[type]
      ? [...this.breadcrumbs[type]]
      : [...this.breadcrumbs.home];

    // Pop off last breadcrumb
    const lastBreadcrumb = newBreadcrumbs.pop() as BreadcrumbItem;

    // Put last breadcrumb back without href
    newBreadcrumbs.push({
      ...lastBreadcrumb,
      href: undefined,
    });

    this.chrome.setBreadcrumbs(newBreadcrumbs);
  }
}

export const breadcrumbService = new BreadcrumbService();

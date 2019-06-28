/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BASE_PATH } from '../../constants';
import { textService } from '../text';

class BreadcrumbService {
  private chrome: any;
  private breadcrumbs: any = {
    management: {},
    home: {},
    repositoryAdd: {},
    repositoryEdit: {},
  };

  public init(chrome: any, managementBreadcrumb: any): void {
    this.chrome = chrome;
    this.breadcrumbs.management = managementBreadcrumb;
    this.breadcrumbs.home = {
      text: textService.breadcrumbs.home,
      href: `#${BASE_PATH}`,
    };
    this.breadcrumbs.repositoryAdd = {
      text: textService.breadcrumbs.repositoryAdd,
      href: `#${BASE_PATH}/add_repository`,
    };
    this.breadcrumbs.repositoryEdit = {
      text: textService.breadcrumbs.repositoryEdit,
    };
  }

  public setBreadcrumbs(type: string): void {
    if (!this.breadcrumbs[type]) {
      return;
    }
    if (type === 'home') {
      this.chrome.breadcrumbs.set([this.breadcrumbs.management, this.breadcrumbs.home]);
    } else {
      this.chrome.breadcrumbs.set([
        this.breadcrumbs.management,
        this.breadcrumbs.home,
        this.breadcrumbs[type],
      ]);
    }
  }
}

export const breadcrumbService = new BreadcrumbService();

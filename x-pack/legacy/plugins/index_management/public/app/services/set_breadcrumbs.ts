/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { BASE_PATH } from '../../../common/constants';

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

  public init(chrome: any, managementBreadcrumb: any): void {
    this.chrome = chrome;
    this.breadcrumbs.management = [managementBreadcrumb];

    this.breadcrumbs.home = [
      ...this.breadcrumbs.management,
      {
        text: i18n.translate('xpack.idxMgmt.breadcrumb.homeLabel', {
          defaultMessage: 'Index Management',
        }),
        href: `#${BASE_PATH}`,
      },
    ];

    this.breadcrumbs.templates = [
      ...this.breadcrumbs.home,
      {
        text: i18n.translate('xpack.idxMgmt.breadcrumb.templatesLabel', {
          defaultMessage: 'Templates',
        }),
        href: `#${BASE_PATH}templates`,
      },
    ];

    this.breadcrumbs.templateCreate = [
      ...this.breadcrumbs.templates,
      {
        text: i18n.translate('xpack.idxMgmt.breadcrumb.createTemplateLabel', {
          defaultMessage: 'Create template',
        }),
      },
    ];

    this.breadcrumbs.templateEdit = [
      ...this.breadcrumbs.templates,
      {
        text: i18n.translate('xpack.idxMgmt.breadcrumb.editTemplateLabel', {
          defaultMessage: 'Edit template',
        }),
      },
    ];

    this.breadcrumbs.templateClone = [
      ...this.breadcrumbs.templates,
      {
        text: i18n.translate('xpack.idxMgmt.breadcrumb.cloneTemplateLabel', {
          defaultMessage: 'Clone template',
        }),
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

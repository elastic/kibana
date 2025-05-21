/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ChromeBreadcrumb } from '@kbn/core/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';

type SetBreadcrumbs = ManagementAppMountParams['setBreadcrumbs'];

// Build the breadcrumbs for this app
const breadcrumbs = (function () {
  const policies: ChromeBreadcrumb[] = [
    {
      text: i18n.translate('xpack.indexLifecycleMgmt.breadcrumb.homeLabel', {
        defaultMessage: 'Index Lifecycle Management',
      }),
      href: `/policies`,
    },
  ];

  const editPolicy: ChromeBreadcrumb[] = [
    ...policies,
    {
      text: i18n.translate('xpack.indexLifecycleMgmt.breadcrumb.editPolicyLabel', {
        defaultMessage: 'Edit policy',
      }),
      href: undefined,
    },
  ];

  return {
    policies,
    editPolicy,
  };
})();

export class BreadcrumbService {
  private setBreadcrumbsHandler?: SetBreadcrumbs;

  public setup(setBreadcrumbsHandler: SetBreadcrumbs): void {
    this.setBreadcrumbsHandler = setBreadcrumbsHandler;
  }

  public setBreadcrumbs(type: keyof typeof breadcrumbs): void {
    if (!this.setBreadcrumbsHandler) {
      throw new Error(`BreadcrumbService#setup() must be called first!`);
    }

    const newBreadcrumbs = breadcrumbs[type] ? [...breadcrumbs[type]] : [...breadcrumbs.policies];

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

    this.setBreadcrumbsHandler(newBreadcrumbs);
  }
}

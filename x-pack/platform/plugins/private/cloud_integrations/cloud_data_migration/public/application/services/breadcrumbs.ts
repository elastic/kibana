/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';

type SetBreadcrumbs = ManagementAppMountParams['setBreadcrumbs'];

interface Breadcrumb {
  text: string;
  href?: string;
}

interface Breadcrumbs {
  home: Breadcrumb;
}

const breadcrumbs: Breadcrumbs = {
  home: {
    text: i18n.translate('xpack.cloudDataMigration.breadcrumb.label', {
      defaultMessage: 'Migrate to Elastic Cloud',
    }),
  },
};

export class BreadcrumbService {
  private setBreadcrumbsHandler?: SetBreadcrumbs;

  public setup(setBreadcrumbsHandler: SetBreadcrumbs): void {
    this.setBreadcrumbsHandler = setBreadcrumbsHandler;
  }

  public setBreadcrumbs(type: keyof typeof breadcrumbs): void {
    if (!this.setBreadcrumbsHandler) {
      throw new Error(`BreadcrumbService#setup() must be called first!`);
    }

    this.setBreadcrumbsHandler([breadcrumbs.home]);
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { textService } from '../text';
import {
  linkToHome,
  linkToSnapshots,
  linkToRepositories,
  linkToPolicies,
  linkToRestoreStatus,
} from '.';

type SetBreadcrumbs = ManagementAppMountParams['setBreadcrumbs'];

class BreadcrumbService {
  private breadcrumbs: {
    [key: string]: Array<{
      text: string;
      href?: string;
    }>;
  } = {
    management: [],
    home: [],
    snapshots: [],
    repositories: [],
    policies: [],
    restore_status: [],
    repositoryAdd: [],
    repositoryEdit: [],
    restoreSnapshot: [],
    policyAdd: [],
    policyEdit: [],
  };
  private setBreadcrumbsHandler?: SetBreadcrumbs;

  public setup(setBreadcrumbsHandler: SetBreadcrumbs): void {
    this.setBreadcrumbsHandler = setBreadcrumbsHandler;

    // Home and sections
    this.breadcrumbs.home = [
      {
        text: textService.breadcrumbs.home,
        href: linkToHome(),
      },
    ];

    this.breadcrumbs.snapshots = [
      ...this.breadcrumbs.home,
      {
        text: textService.breadcrumbs.snapshots,
        href: linkToSnapshots(),
      },
    ];

    this.breadcrumbs.repositories = [
      ...this.breadcrumbs.home,
      {
        text: textService.breadcrumbs.repositories,
        href: linkToRepositories(),
      },
    ];

    this.breadcrumbs.policies = [
      ...this.breadcrumbs.home,
      {
        text: textService.breadcrumbs.policies,
        href: linkToPolicies(),
      },
    ];

    this.breadcrumbs.restore_status = [
      ...this.breadcrumbs.home,
      {
        text: textService.breadcrumbs.restore_status,
        href: linkToRestoreStatus(),
      },
    ];

    // Inner pages
    this.breadcrumbs.repositoryAdd = [
      ...this.breadcrumbs.repositories,
      {
        text: textService.breadcrumbs.repositoryAdd,
      },
    ];

    this.breadcrumbs.repositoryEdit = [
      ...this.breadcrumbs.repositories,
      {
        text: textService.breadcrumbs.repositoryEdit,
      },
    ];

    this.breadcrumbs.restoreSnapshot = [
      ...this.breadcrumbs.snapshots,
      {
        text: textService.breadcrumbs.restoreSnapshot,
      },
    ];

    this.breadcrumbs.policyAdd = [
      ...this.breadcrumbs.policies,
      {
        text: textService.breadcrumbs.policyAdd,
      },
    ];

    this.breadcrumbs.policyEdit = [
      ...this.breadcrumbs.policies,
      {
        text: textService.breadcrumbs.policyEdit,
      },
    ];
  }

  public setBreadcrumbs(type: string): void {
    if (!this.setBreadcrumbsHandler) {
      throw new Error(`BreadcrumbService#setup() must be called first!`);
    }

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

    this.setBreadcrumbsHandler(newBreadcrumbs);
  }
}

export const breadcrumbService = new BreadcrumbService();

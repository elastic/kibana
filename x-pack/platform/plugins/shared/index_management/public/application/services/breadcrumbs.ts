/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { EuiBreadcrumb } from '@elastic/eui';

type SetBreadcrumbs = ManagementAppMountParams['setBreadcrumbs'];

export enum IndexManagementBreadcrumb {
  home = 'home',
  /**
   * Indices tab
   */
  indices = 'indices',
  /**
   * Index details page
   */
  indexDetails = 'indexDetails',
  /**
   * Data streams tab
   */
  dataStreams = 'dataStreams',
  /**
   * Index templates tab
   */
  templates = 'templates',
  templateCreate = 'templateCreate',
  templateEdit = 'templateEdit',
  templateClone = 'templateClone',
  /**
   * Component templates tab
   */
  componentTemplates = 'componentTemplates',
  componentTemplateCreate = 'componentTemplateCreate',
  componentTemplateEdit = 'componentTemplateEdit',
  componentTemplateClone = 'componentTemplateClone',
  /**
   * Enrich policies tab
   */
  enrichPolicies = 'enrichPolicies',
  enrichPoliciesCreate = 'enrichPoliciesCreate',
}

class BreadcrumbService {
  private breadcrumbs: {
    [key in IndexManagementBreadcrumb]?: EuiBreadcrumb[];
  } = {
    home: [] as EuiBreadcrumb[],
  };
  private setBreadcrumbsHandler?: SetBreadcrumbs;

  public setup(setBreadcrumbsHandler: SetBreadcrumbs): void {
    this.setBreadcrumbsHandler = setBreadcrumbsHandler;

    this.breadcrumbs.home = [
      {
        text: i18n.translate('xpack.idxMgmt.breadcrumb.homeLabel', {
          defaultMessage: 'Index Management',
        }),
        href: `/`,
      },
    ];

    this.breadcrumbs.indices = [
      ...this.breadcrumbs.home,
      {
        text: i18n.translate('xpack.idxMgmt.breadcrumb.indicesLabel', {
          defaultMessage: 'Indices',
        }),
        href: `/indices`,
      },
    ];

    this.breadcrumbs.indexDetails = [
      ...this.breadcrumbs.indices,
      {
        text: i18n.translate('xpack.idxMgmt.breadcrumb.indexDetailsLabel', {
          defaultMessage: 'Index details',
        }),
      },
    ];

    this.breadcrumbs.templates = [
      ...this.breadcrumbs.home,
      {
        text: i18n.translate('xpack.idxMgmt.breadcrumb.templatesLabel', {
          defaultMessage: 'Templates',
        }),
        href: `/templates`,
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

    this.breadcrumbs.dataStreams = [
      ...this.breadcrumbs.home,
      {
        text: i18n.translate('xpack.idxMgmt.breadcrumb.dataStreamsLabel', {
          defaultMessage: 'Data streams',
        }),
        href: `/data_streams`,
      },
    ];

    this.breadcrumbs.componentTemplates = [
      ...this.breadcrumbs.home,
      {
        text: i18n.translate('xpack.idxMgmt.breadcrumb.componentTemplatesLabel', {
          defaultMessage: 'Component templates',
        }),
        href: `/component_templates`,
      },
    ];

    this.breadcrumbs.componentTemplateCreate = [
      ...this.breadcrumbs.componentTemplates,
      {
        text: i18n.translate('xpack.idxMgmt.breadcrumb.createComponentTemplateLabel', {
          defaultMessage: 'Create component templates',
        }),
      },
    ];

    this.breadcrumbs.componentTemplateEdit = [
      ...this.breadcrumbs.componentTemplates,
      {
        text: i18n.translate(
          'xpack.idxMgmt.componentTemplate.breadcrumb.editComponentTemplateLabel',
          {
            defaultMessage: 'Edit component template',
          }
        ),
      },
    ];

    this.breadcrumbs.componentTemplateClone = [
      ...this.breadcrumbs.componentTemplates,
      {
        text: i18n.translate(
          'xpack.idxMgmt.componentTemplate.breadcrumb.cloneComponentTemplateLabel',
          {
            defaultMessage: 'Clone component template',
          }
        ),
      },
    ];

    this.breadcrumbs.enrichPolicies = [
      ...this.breadcrumbs.home,
      {
        text: i18n.translate('xpack.idxMgmt.breadcrumb.enrichPolicyLabel', {
          defaultMessage: 'Enrich policies',
        }),
        href: `/enrich_policies`,
      },
    ];

    this.breadcrumbs.enrichPoliciesCreate = [
      ...this.breadcrumbs.enrichPolicies,
      {
        text: i18n.translate('xpack.idxMgmt.breadcrumb.enrichPolicyCreateLabel', {
          defaultMessage: 'Create enrich policy',
        }),
        href: `/enrich_policies/create`,
      },
    ];
  }

  public setBreadcrumbs(
    type: IndexManagementBreadcrumb,
    additionalBreadcrumb?: EuiBreadcrumb
  ): void {
    if (!this.setBreadcrumbsHandler) {
      throw new Error(`BreadcrumbService#setup() must be called first!`);
    }

    const newBreadcrumbs = this.breadcrumbs[type]
      ? [...this.breadcrumbs[type]!]
      : [...this.breadcrumbs.home!];

    if (additionalBreadcrumb) {
      newBreadcrumbs.push(additionalBreadcrumb);
    }

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
